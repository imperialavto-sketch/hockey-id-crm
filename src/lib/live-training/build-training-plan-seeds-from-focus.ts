/**
 * PHASE 18: черновые блоки структуры тренировки из planning focus (без AI, без сохранения).
 * PHASE 29: тот же builder учитывает optional carryForward (continuity), без нового планировщика.
 */

import type { LiveTrainingCarryForwardDto } from "./live-training-carry-forward";
import type { LiveTrainingAdaptivePlanningSignals } from "./liveTrainingAdaptivePlanning";
import { computeLiveTrainingAdaptivePlanningSignals } from "./liveTrainingAdaptivePlanning";

export type TrainingPlanSeedBlockType = "warmup" | "main" | "focus" | "reinforcement";

export type TrainingPlanSeedBlockDto = {
  type: TrainingPlanSeedBlockType;
  title: string;
  description: string;
  linkedDomains?: string[];
  focusPlayers?: Array<{ playerId: string; playerName: string }>;
};

export type TrainingPlanSeedsResultDto = {
  blocks: TrainingPlanSeedBlockDto[];
  lowData: boolean;
};

export type PlanningFocusForPlanSeeds = {
  focusPlayers: Array<{ playerId: string; playerName: string; reasons: string[] }>;
  focusDomains: Array<{ domain: string; labelRu: string }>;
  reinforceAreas: Array<{ domain: string; labelRu: string }>;
  lowData: boolean;
};

const WARMUP_GENERIC =
  "Лёгкая общая разминка: суставы, простой разогрев и вовлечение в темп без жёсткого акценда на тему.";

const MAX_BLOCKS = 4;
const MAX_MAIN_DOMAINS = 3;
const MAX_WARMUP_DOMAIN_MENTIONS = 2;
const MAX_FOCUS_PLAYERS_IN_BLOCK = 2;
const REASON_SNIP = 72;

function firstTokenName(fullName: string): string {
  const t = fullName.trim().split(/\s+/)[0];
  return t || fullName;
}

function snip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function carryHasUsableContent(cf: LiveTrainingCarryForwardDto): boolean {
  return (
    cf.focusDomains.length > 0 || cf.focusPlayers.length > 0 || cf.reinforceAreas.length > 0
  );
}

function carryHasFollowUpMaterial(cf: LiveTrainingCarryForwardDto): boolean {
  return (
    cf.focusPlayers.some(
      (p) => p.source === "follow_up" || p.source === "unresolved_priority_carry_forward"
    ) ||
    cf.focusDomains.some(
      (d) => d.source === "follow_up" || d.source === "unresolved_priority_carry_forward"
    ) ||
    cf.reinforceAreas.some(
      (r) => r.source === "follow_up" || r.source === "unresolved_priority_carry_forward"
    )
  );
}

/** Домены в порядке приоритета: пересечение CF↔plan, затем CF, затем plan; без дублей ключей. */
type MergedDomainRow = {
  domain: string;
  labelRu: string;
  overlap: boolean;
  carryFollowUp: boolean;
};

function mergeDomainsForSeeds(
  plan: PlanningFocusForPlanSeeds["focusDomains"],
  cf: LiveTrainingCarryForwardDto | null,
  cautiousCarry: boolean
): MergedDomainRow[] {
  if (!cf) {
    return plan.map((d) => ({
      domain: d.domain,
      labelRu: d.labelRu,
      overlap: false,
      carryFollowUp: false,
    }));
  }

  const planSet = new Set(plan.map((d) => d.domain));
  const planEmpty = plan.length === 0;
  const seen = new Set<string>();
  const rows: MergedDomainRow[] = [];

  const tryAddFromCf = (d: LiveTrainingCarryForwardDto["focusDomains"][number]) => {
    if (seen.has(d.domain)) return;
    const overlap = planSet.has(d.domain);
    const carryFollowUp =
      d.source === "follow_up" || d.source === "unresolved_priority_carry_forward";
    if (cautiousCarry && !overlap) {
      if (d.source === "planning_focus") return;
      // Не раздувать main planning слабым «последняя сессия», если темы уже есть
      if (!planEmpty && d.source === "recent_wrap_up") return;
    }
    seen.add(d.domain);
    rows.push({
      domain: d.domain,
      labelRu: d.labelRu,
      overlap,
      carryFollowUp,
    });
  };

  for (const d of cf.focusDomains) {
    if (planSet.has(d.domain)) tryAddFromCf(d);
  }
  for (const d of cf.focusDomains) {
    if (!planSet.has(d.domain)) tryAddFromCf(d);
  }
  for (const d of plan) {
    if (seen.has(d.domain)) continue;
    seen.add(d.domain);
    rows.push({
      domain: d.domain,
      labelRu: d.labelRu,
      overlap: false,
      carryFollowUp: false,
    });
  }
  return rows;
}

type MergedPlayerRow = {
  playerId: string;
  playerName: string;
  reasons: string[];
};

function mergePlayersForSeeds(
  plan: PlanningFocusForPlanSeeds["focusPlayers"],
  cf: LiveTrainingCarryForwardDto | null,
  cautiousCarry: boolean
): MergedPlayerRow[] {
  if (!cf) {
    return plan.map((p) => ({ playerId: p.playerId, playerName: p.playerName, reasons: p.reasons }));
  }

  const cfById = new Map(cf.focusPlayers.map((p) => [p.playerId, p]));
  const cfIds = new Set(cf.focusPlayers.map((p) => p.playerId));
  const seen = new Set<string>();
  const out: MergedPlayerRow[] = [];

  for (const p of plan) {
    if (!cfIds.has(p.playerId)) continue;
    const cfp = cfById.get(p.playerId);
    seen.add(p.playerId);
    const carryReason = cfp?.reason?.trim();
    const hint =
      carryReason && p.reasons[0]
        ? snip(`Вернуться к наблюдению: ${carryReason}`, REASON_SNIP)
        : carryReason
          ? snip(`Перепроверить на старте: ${carryReason}`, REASON_SNIP)
          : p.reasons[0]
            ? snip(p.reasons[0], REASON_SNIP)
            : "точка внимания из недавних наблюдений";
    out.push({
      playerId: p.playerId,
      playerName: p.playerName,
      reasons: [hint],
    });
  }

  for (const p of cf.focusPlayers) {
    if (seen.has(p.playerId)) continue;
    if (
      cautiousCarry &&
      p.source !== "follow_up" &&
      p.source !== "unresolved_priority_carry_forward"
    ) {
      continue;
    }
    seen.add(p.playerId);
    out.push({
      playerId: p.playerId,
      playerName: p.playerName,
      reasons: [snip(`Перепроверить на старте: ${p.reason}`, REASON_SNIP)],
    });
  }

  for (const p of plan) {
    if (seen.has(p.playerId)) continue;
    seen.add(p.playerId);
    out.push({
      playerId: p.playerId,
      playerName: p.playerName,
      reasons: p.reasons,
    });
  }

  return out;
}

function mergeReinforceForSeeds(
  plan: PlanningFocusForPlanSeeds["reinforceAreas"],
  cf: LiveTrainingCarryForwardDto | null,
  usedDomainKeys: Set<string>
): Array<{ domain: string; labelRu: string }> {
  const out: Array<{ domain: string; labelRu: string }> = [];
  const seen = new Set<string>();

  if (cf) {
    for (const r of cf.reinforceAreas) {
      if (usedDomainKeys.has(r.domain) || seen.has(r.domain)) continue;
      seen.add(r.domain);
      out.push({ domain: r.domain, labelRu: r.labelRu });
      if (out.length >= 2) return out;
    }
  }

  for (const r of plan) {
    if (usedDomainKeys.has(r.domain) || seen.has(r.domain)) continue;
    seen.add(r.domain);
    out.push({ domain: r.domain, labelRu: r.labelRu });
    if (out.length >= 2) break;
  }
  return out;
}

function computeSeedsResultLowData(
  focus: PlanningFocusForPlanSeeds,
  carryForward: LiveTrainingCarryForwardDto | null
): boolean {
  if (!focus.lowData) return false;
  if (!carryForward) return true;
  if (carryHasFollowUpMaterial(carryForward)) return false;
  return carryForward.lowData;
}

/**
 * PHASE 29: основной вход — planning focus + optional carryForward.
 */
export function buildTrainingPlanSeedsFromPlanning(
  focus: PlanningFocusForPlanSeeds,
  carryForward: LiveTrainingCarryForwardDto | null,
  adaptivePlanning?: LiveTrainingAdaptivePlanningSignals | null
): TrainingPlanSeedsResultDto {
  const adaptive =
    adaptivePlanning ?? computeLiveTrainingAdaptivePlanningSignals(null);
  const resultLowData = computeSeedsResultLowData(focus, carryForward);
  /** PHASE 46: partial/weak закрытие прошлого старта усиливает осторожность merge (как lowData). */
  const cautiousCarry =
    Boolean(carryForward?.lowData) || adaptive.seedsExtraCautious;
  const maxBlocks = adaptive.seedsMaxBlocks;
  const maxMainDomains = adaptive.seedsMaxMainDomains;

  if (focus.lowData && (!carryForward || !carryHasUsableContent(carryForward))) {
    return {
      blocks: [
        {
          type: "warmup",
          title: "Разминка",
          description: WARMUP_GENERIC,
        },
      ],
      lowData: true,
    };
  }

  const mergedDomains = mergeDomainsForSeeds(focus.focusDomains, carryForward, cautiousCarry);
  const mergedPlayers = mergePlayersForSeeds(focus.focusPlayers, carryForward, cautiousCarry);

  if (mergedDomains.length === 0 && mergedPlayers.length === 0) {
    const reinforceOnly =
      carryForward &&
      carryForward.reinforceAreas.length > 0 &&
      mergeReinforceForSeeds(focus.reinforceAreas, carryForward, new Set()).length > 0;
    if (!reinforceOnly) {
      return {
        blocks: [{ type: "warmup", title: "Разминка", description: WARMUP_GENERIC }],
        lowData: true,
      };
    }
  }

  const blocks: TrainingPlanSeedBlockDto[] = [];
  const usedDomainKeys = new Set<string>();
  const cfPresent = carryForward != null;

  // A. Warmup
  if (mergedDomains.length > 0) {
    const w = mergedDomains.slice(0, MAX_WARMUP_DOMAIN_MENTIONS);
    w.forEach((d) => usedDomainKeys.add(d.domain));
    const cfDomainKeys = new Set((carryForward?.focusDomains ?? []).map((d) => d.domain));
    const warmupContinuity =
      cfPresent &&
      cfDomainKeys.size > 0 &&
      w.some((d) => cfDomainKeys.has(d.domain) || d.overlap || d.carryFollowUp);

    let description: string;
    if (warmupContinuity) {
      description = `С учётом прошлого занятия мягко включить: ${w.map((d) => d.labelRu).join(", ")}.`;
    } else {
      description = `Мягко включить темы: ${w.map((d) => d.labelRu).join(", ")}.`;
    }
    if (resultLowData) {
      description = snip(description, 140);
    }

    blocks.push({
      type: "warmup",
      title: "Разминка",
      description,
      linkedDomains: w.map((d) => d.domain),
    });
  } else {
    blocks.push({
      type: "warmup",
      title: "Разминка",
      description: WARMUP_GENERIC,
    });
  }

  // B. Main
  const mainCandidates = mergedDomains
    .filter((d) => !usedDomainKeys.has(d.domain))
    .slice(0, maxMainDomains);
  if (mainCandidates.length > 0) {
    mainCandidates.forEach((d) => usedDomainKeys.add(d.domain));
    const strongMain = mainCandidates.some((d) => d.overlap || d.carryFollowUp);
    let description: string;
    if (cfPresent && strongMain) {
      description = `Вернуться к теме и усилить: ${mainCandidates.map((d) => d.labelRu).join(", ")}.`;
    } else {
      description = `Упражнения на ${mainCandidates.map((d) => d.labelRu).join(", ")}.`;
    }
    if (resultLowData) description = snip(description, 130);
    blocks.push({
      type: "main",
      title: "Основной блок",
      description,
      linkedDomains: mainCandidates.map((d) => d.domain),
    });
  } else if (mergedDomains.length > 0) {
    const fd = mergedDomains;
    const strongMain = fd.slice(0, maxMainDomains).some((d) => d.overlap || d.carryFollowUp);
    let description = `Упражнения на ${fd
      .slice(0, maxMainDomains)
      .map((d) => d.labelRu)
      .join(", ")}.`;
    if (cfPresent && strongMain) {
      description = `Вернуться к теме: ${fd
        .slice(0, maxMainDomains)
        .map((d) => d.labelRu)
        .join(", ")}.`;
    }
    if (resultLowData) description = snip(description, 130);
    blocks.push({
      type: "main",
      title: "Основной блок",
      description,
    });
  }

  // C. Focus
  if (mergedPlayers.length > 0) {
    const pl = mergedPlayers.slice(0, MAX_FOCUS_PLAYERS_IN_BLOCK);
    const parts = pl.map((p) => {
      const hint = p.reasons[0]
        ? snip(p.reasons[0], REASON_SNIP)
        : "точка внимания из недавних наблюдений";
      return `${firstTokenName(p.playerName)} — ${hint}`;
    });
    let description = `Уделить внимание: ${parts.join("; ")}.`;
    if (resultLowData) description = snip(description, 140);
    blocks.push({
      type: "focus",
      title: "Индивидуальный фокус",
      description,
      focusPlayers: pl.map(({ playerId, playerName }) => ({ playerId, playerName })),
    });
  }

  // D. Reinforcement — CF приоритет; без дубля доменов с разминкой/основным
  const ra = mergeReinforceForSeeds(focus.reinforceAreas, carryForward, usedDomainKeys);
  if (ra.length > 0) {
    const slice = ra.slice(0, 2);
    slice.forEach((r) => usedDomainKeys.add(r.domain));
    let description = `Закрепить: ${slice.map((r) => r.labelRu).join(", ")}.`;
    if (cfPresent && carryForward!.reinforceAreas.some((c) => slice.some((s) => s.domain === c.domain))) {
      description = `Закрепить (перенос с прошлого цикла): ${slice.map((r) => r.labelRu).join(", ")}.`;
    }
    if (resultLowData) description = snip(description, 120);
    blocks.push({
      type: "reinforcement",
      title: "Закрепление",
      description,
      linkedDomains: slice.map((r) => r.domain),
    });
  }

  return {
    blocks: blocks.slice(0, maxBlocks),
    lowData: resultLowData,
  };
}

/**
 * PHASE 18 thin wrapper: только planning focus, без carryForward.
 */
export function buildTrainingPlanSeedsFromFocus(
  focus: PlanningFocusForPlanSeeds
): TrainingPlanSeedsResultDto {
  return buildTrainingPlanSeedsFromPlanning(focus, null);
}
