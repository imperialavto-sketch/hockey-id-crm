/**
 * PHASE 46: адаптация следующего планирования к качеству закрытия приоритетов прошлой сессии
 * (priorityAlignmentReview на continuity snapshot). Rule-based, без LLM.
 */

import type { LiveTrainingContinuitySnapshotDto } from "./live-training-continuity-lock-in";
import type { LiveTrainingPriorityAlignmentReviewDto } from "./liveTrainingPriorityReviewScorer";

export type AlignmentExecutionMode = "stable" | "recover" | "reset";

export type UnresolvedPriorityBoostLevel = "none" | "moderate" | "high";

/** Компактные сигналы для start priorities + plan seeds (additive). */
export type LiveTrainingAdaptivePlanningSignals = {
  alignmentExecutionMode: AlignmentExecutionMode;
  unresolvedPriorityBoostAllowed: boolean;
  unresolvedPriorityBoostLevel: UnresolvedPriorityBoostLevel;
  /**
   * Ограничение, сколько primary-слотов могут занять «новые» источники (planning_focus / recent_wrap_up).
   * null — только общий MAX_PRIMARY_* из билдера.
   */
  cautiousNewPriorityLimit: {
    maxPlanningFocusPlayers: number;
    maxPlanningFocusDomains: number;
    maxRecentWrapDomains: number;
  } | null;
  /** Усилить hooks cautiousCarry в mergeDomains/mergePlayers для seeds. */
  seedsExtraCautious: boolean;
  seedsMaxBlocks: number;
  seedsMaxMainDomains: number;
  maxSecondaryItems: number;
  /** Одна строка в summaryLines старта (RU), если режим не stable. */
  adaptiveSummaryHint: string | null;
};

const DEFAULT_MAX_BLOCKS = 4;
const DEFAULT_MAX_MAIN_DOMAINS = 3;
const DEFAULT_MAX_SECONDARY = 3;

/** Порядок tier для primary players: follow_up всегда первый. */
export const ADAPTIVE_PLAYER_TIER_STABLE = [
  "follow_up",
  "continuity_lock_in",
  "unresolved_priority_carry_forward",
  "planning_focus",
] as const;

/** recover / reset: незакрытые приоритеты выше lock-in (без вытеснения follow-up). */
export const ADAPTIVE_PLAYER_TIER_BOOSTED = [
  "follow_up",
  "unresolved_priority_carry_forward",
  "continuity_lock_in",
  "planning_focus",
] as const;

export const ADAPTIVE_DOMAIN_TIER_STABLE = [
  "follow_up",
  "continuity_lock_in",
  "unresolved_priority_carry_forward",
  "recent_wrap_up",
  "planning_focus",
] as const;

export const ADAPTIVE_DOMAIN_TIER_BOOSTED = [
  "follow_up",
  "unresolved_priority_carry_forward",
  "continuity_lock_in",
  "recent_wrap_up",
  "planning_focus",
] as const;

function isActionableReview(
  par: LiveTrainingPriorityAlignmentReviewDto | null | undefined
): par is LiveTrainingPriorityAlignmentReviewDto {
  if (!par || !par.evaluationApplied || par.skippedNoTargets) return false;
  if (par.alignmentBand === "not_applicable") return false;
  return (
    par.alignmentBand === "strong" ||
    par.alignmentBand === "partial" ||
    par.alignmentBand === "weak"
  );
}

/**
 * Читает только continuity snapshot; без побочных эффектов.
 * Нет review / skipped / not_applicable → stable (no-op для адаптации).
 */
export function computeLiveTrainingAdaptivePlanningSignals(
  lockInSnapshot: LiveTrainingContinuitySnapshotDto | null | undefined
): LiveTrainingAdaptivePlanningSignals {
  const par = lockInSnapshot?.priorityAlignmentReview;
  if (!isActionableReview(par)) {
    return {
      alignmentExecutionMode: "stable",
      unresolvedPriorityBoostAllowed: false,
      unresolvedPriorityBoostLevel: "none",
      cautiousNewPriorityLimit: null,
      seedsExtraCautious: false,
      seedsMaxBlocks: DEFAULT_MAX_BLOCKS,
      seedsMaxMainDomains: DEFAULT_MAX_MAIN_DOMAINS,
      maxSecondaryItems: DEFAULT_MAX_SECONDARY,
      adaptiveSummaryHint: null,
    };
  }

  if (par.alignmentBand === "strong") {
    return {
      alignmentExecutionMode: "stable",
      unresolvedPriorityBoostAllowed: false,
      unresolvedPriorityBoostLevel: "none",
      cautiousNewPriorityLimit: null,
      seedsExtraCautious: false,
      seedsMaxBlocks: DEFAULT_MAX_BLOCKS,
      seedsMaxMainDomains: DEFAULT_MAX_MAIN_DOMAINS,
      maxSecondaryItems: DEFAULT_MAX_SECONDARY,
      adaptiveSummaryHint: null,
    };
  }

  if (par.alignmentBand === "partial") {
    return {
      alignmentExecutionMode: "recover",
      unresolvedPriorityBoostAllowed: true,
      unresolvedPriorityBoostLevel: "moderate",
      cautiousNewPriorityLimit: {
        maxPlanningFocusPlayers: 2,
        maxPlanningFocusDomains: 2,
        maxRecentWrapDomains: 2,
      },
      seedsExtraCautious: true,
      seedsMaxBlocks: DEFAULT_MAX_BLOCKS,
      seedsMaxMainDomains: DEFAULT_MAX_MAIN_DOMAINS,
      maxSecondaryItems: DEFAULT_MAX_SECONDARY,
      adaptiveSummaryHint:
        "Прошлый старт закрыт частично — приоритет на переносы и незакрытые ориентиры.",
    };
  }

  // weak
  return {
    alignmentExecutionMode: "reset",
    unresolvedPriorityBoostAllowed: true,
    unresolvedPriorityBoostLevel: "high",
    cautiousNewPriorityLimit: {
      maxPlanningFocusPlayers: 1,
      maxPlanningFocusDomains: 1,
      maxRecentWrapDomains: 1,
    },
    seedsExtraCautious: true,
    seedsMaxBlocks: 3,
    seedsMaxMainDomains: 2,
    maxSecondaryItems: 2,
    adaptiveSummaryHint:
      "Слабое закрытие приоритетов прошлого старта — план уплотняем, фокус на переносе.",
  };
}

/** PHASE 47: давление по истории (coach intelligence) — лёгкое усиление осторожности без перезаписи режима прошлой сессии. */
export type ExecutionPressureMode = "normal" | "watch" | "tighten";

export function applyExecutionPressureToAdaptive(
  base: LiveTrainingAdaptivePlanningSignals,
  pressure: ExecutionPressureMode
): LiveTrainingAdaptivePlanningSignals {
  if (pressure !== "tighten") return base;
  if (base.alignmentExecutionMode !== "stable") return base;
  return {
    ...base,
    seedsExtraCautious: true,
    maxSecondaryItems: Math.min(base.maxSecondaryItems, 2),
  };
}
