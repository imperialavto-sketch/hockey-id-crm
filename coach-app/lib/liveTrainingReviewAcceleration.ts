/**
 * PHASE 24: session-level buckets и client-side фильтры для экрана review live training.
 */

import { buildLiveTrainingDraftProvenanceHints } from "@/lib/liveTrainingDraftProvenanceHints";
import type { LiveTrainingObservationDraft } from "@/types/liveTraining";

export type LiveTrainingReviewFilterMode =
  | "all"
  | "needs_review"
  | "quick_fixes"
  | "no_player"
  | "context_helped"
  | "broad_category";

export type LiveTrainingReviewAccelerationCounts = {
  /** needsReview */
  needsReviewCount: number;
  /** correctionSuggestions.length > 0 */
  quickFixCount: number;
  /** нет playerId */
  noPlayerCount: number;
  /** есть human-readable provenance hints (как в PHASE 22) */
  contextHelpedCount: number;
  /** general_observation / общее */
  broadCategoryCount: number;
  /** без пометки проверки и без быстрых правок (справочно, не chip) */
  readyCount: number;
  totalCount: number;
};

/** Сводка buckets для UI «Быстрый проход». */
export type LiveTrainingReviewAcceleration = {
  counts: LiveTrainingReviewAccelerationCounts;
};

function draftHasQuickFixes(d: LiveTrainingObservationDraft): boolean {
  return (d.correctionSuggestions?.length ?? 0) > 0;
}

function draftIsBroadCategory(d: LiveTrainingObservationDraft): boolean {
  const c = d.category.trim();
  return c === "general_observation" || c === "общее";
}

function draftContextHelped(d: LiveTrainingObservationDraft): boolean {
  return buildLiveTrainingDraftProvenanceHints(d.needsReview, d.provenance ?? null).length > 0;
}

/**
 * Actionable сводка по всем активным черновикам сессии (те же данные, что уже на клиенте).
 */
export function buildLiveTrainingReviewAcceleration(
  drafts: LiveTrainingObservationDraft[]
): LiveTrainingReviewAcceleration {
  let needsReviewCount = 0;
  let quickFixCount = 0;
  let noPlayerCount = 0;
  let contextHelpedCount = 0;
  let broadCategoryCount = 0;
  let readyCount = 0;

  for (const d of drafts) {
    if (d.needsReview) needsReviewCount += 1;
    if (draftHasQuickFixes(d)) quickFixCount += 1;
    if (d.playerId == null) noPlayerCount += 1;
    if (draftContextHelped(d)) contextHelpedCount += 1;
    if (draftIsBroadCategory(d)) broadCategoryCount += 1;
    if (!d.needsReview && !draftHasQuickFixes(d)) readyCount += 1;
  }

  return {
    counts: {
      needsReviewCount,
      quickFixCount,
      noPlayerCount,
      contextHelpedCount,
      broadCategoryCount,
      readyCount,
      totalCount: drafts.length,
    },
  };
}

export function draftMatchesReviewFilter(
  d: LiveTrainingObservationDraft,
  mode: LiveTrainingReviewFilterMode
): boolean {
  if (mode === "all") return true;
  switch (mode) {
    case "needs_review":
      return d.needsReview;
    case "quick_fixes":
      return draftHasQuickFixes(d);
    case "no_player":
      return d.playerId == null;
    case "context_helped":
      return draftContextHelped(d);
    case "broad_category":
      return draftIsBroadCategory(d);
    default:
      return true;
  }
}

export function filterDraftsByReviewMode(
  drafts: LiveTrainingObservationDraft[],
  mode: LiveTrainingReviewFilterMode
): LiveTrainingObservationDraft[] {
  if (mode === "all") return drafts;
  return drafts.filter((d) => draftMatchesReviewFilter(d, mode));
}

export const LIVE_TRAINING_REVIEW_FILTER_LABELS: Record<Exclude<LiveTrainingReviewFilterMode, "all">, string> = {
  needs_review: "Требует проверки",
  quick_fixes: "Быстрые правки",
  no_player: "Без игрока",
  context_helped: "Контекст помог",
  broad_category: "Общая категория",
};

export function liveTrainingReviewFilterEmptyHint(mode: LiveTrainingReviewFilterMode): string {
  switch (mode) {
    case "needs_review":
      return "Нет наблюдений с пометкой «требует проверки». Можно вернуться к полному списку.";
    case "quick_fixes":
      return "Нет наблюдений с быстрыми правками. Откройте карточку для ручной правки или переключите фильтр.";
    case "no_player":
      return "Все наблюдения привязаны к игрокам.";
    case "context_helped":
      return "Нет наблюдений с подсказками по контексту плана для этой сессии.";
    case "broad_category":
      return "Нет наблюдений с широкой категорией «общее».";
    default:
      return "";
  }
}
