/**
 * Компактная сводка непрерывности между сессиями для старта live-training.
 * Только из уже посчитанных сигналов start-planning; не источник истины и не замена детальных блоков.
 */

import type { LiveTrainingCarryForwardSeedDto } from "./finalize-carry-forward-seed";
import type { LiveTrainingCarryForwardDto } from "./live-training-carry-forward";
import type { LiveTrainingCoachIntelligenceDto } from "./liveTrainingCoachIntelligence";
import type { NextTrainingStartPrioritiesDto } from "./next-training-start-priorities";

/** Узкий срез доменов из агрегированного планирования (fallback для «текущий фокус»). */
export type CrossSessionPlanningDomainSlice = { labelRu: string };

export type CoachCrossSessionContinuitySummaryDto = {
  carryFromPreviousCycle: string[];
  recurringNow: string[];
  stabilizingAreas: string[];
  currentFocus: string[];
  confidence: "low" | "moderate" | "high";
  note?: string;
};

const MAX_PER_GROUP = 3;
const MAX_HINT = 80;

export type CrossSessionContinuitySummaryInput = {
  lowData: boolean;
  carryForwardSeed: LiveTrainingCarryForwardSeedDto | null;
  carryForward: LiveTrainingCarryForwardDto | null;
  startPriorities: NextTrainingStartPrioritiesDto;
  lastSessionHandoffHints: string[];
  coachIntelligence: LiveTrainingCoachIntelligenceDto;
  /** Если приоритеты пусты — кратко подтянуть темы из расчётного фокуса команды. */
  planningFocusDomains?: CrossSessionPlanningDomainSlice[];
};

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

function stripBracketPrefix(s: string): string {
  const t = s.trim();
  if (!t.startsWith("[")) return t;
  const c = t.indexOf("]");
  if (c <= 0) return t;
  return t.slice(c + 1).trim();
}

function dedupePush(arr: string[], seen: Set<string>, line: string, max: number): void {
  if (arr.length >= max) return;
  const raw = line.trim();
  if (!raw) return;
  const clipped = raw.length > MAX_HINT ? `${raw.slice(0, MAX_HINT - 1)}…` : raw;
  const k = normKey(stripBracketPrefix(clipped));
  if (!k || seen.has(k)) return;
  seen.add(k);
  arr.push(clipped);
}

function seedNormSet(seed: LiveTrainingCarryForwardSeedDto | null): Set<string> {
  const out = new Set<string>();
  if (!seed) return out;
  for (const x of [...seed.worthRechecking, ...seed.possibleCarryForward, ...seed.optionalContextOnly]) {
    const k = normKey(stripBracketPrefix(x));
    if (k) out.add(k);
  }
  return out;
}

/**
 * null — нечего показать в компактном слое (экран старта без блока).
 */
export function buildCoachCrossSessionContinuitySummary(
  input: CrossSessionContinuitySummaryInput
): CoachCrossSessionContinuitySummaryDto | null {
  const seen = new Set<string>();
  const carryFromPreviousCycle: string[] = [];
  const recurringNow: string[] = [];
  const stabilizingAreas: string[] = [];
  const currentFocus: string[] = [];

  const { carryForwardSeed, carryForward, startPriorities, lastSessionHandoffHints, coachIntelligence } =
    input;

  if (carryForwardSeed?.source === "finalize_carry_forward") {
    for (const x of carryForwardSeed.worthRechecking) {
      dedupePush(carryFromPreviousCycle, seen, x, MAX_PER_GROUP);
    }
    for (const x of carryForwardSeed.possibleCarryForward) {
      dedupePush(carryFromPreviousCycle, seen, x, MAX_PER_GROUP);
    }
    for (const x of carryForwardSeed.optionalContextOnly) {
      dedupePush(carryFromPreviousCycle, seen, x, MAX_PER_GROUP);
    }
  }

  for (const h of lastSessionHandoffHints) {
    dedupePush(carryFromPreviousCycle, seen, h, MAX_PER_GROUP);
  }

  for (const line of carryForward?.carryForwardSummary ?? []) {
    dedupePush(carryFromPreviousCycle, seen, line, MAX_PER_GROUP);
  }

  const seedKeys = seedNormSet(
    carryForwardSeed?.source === "finalize_carry_forward" ? carryForwardSeed : null
  );

  for (const d of startPriorities.primaryDomains) {
    if (recurringNow.length >= MAX_PER_GROUP) break;
    const label = d.labelRu?.trim();
    if (!label) continue;
    const nk = normKey(label);
    if (nk && seedKeys.has(nk)) {
      dedupePush(
        recurringNow,
        seen,
        `${label}: тема есть и в переносе с прошлого старта, и в приоритетах сегодня`,
        MAX_PER_GROUP
      );
    }
  }

  for (const s of coachIntelligence.signals) {
    if (recurringNow.length >= MAX_PER_GROUP) break;
    if (
      s.type !== "repeated_domain_gap" &&
      s.type !== "repeated_player_gap" &&
      s.type !== "repeated_reinforcement_gap" &&
      s.type !== "carry_forward_pressure"
    ) {
      continue;
    }
    const ex = s.explanation?.trim();
    if (!ex) continue;
    dedupePush(recurringNow, seen, ex, MAX_PER_GROUP);
  }

  for (const r of carryForward?.reinforceAreas ?? []) {
    const label = r.labelRu?.trim();
    if (!label) continue;
    dedupePush(stabilizingAreas, seen, label, MAX_PER_GROUP);
  }

  for (const item of startPriorities.reinforcementItems) {
    dedupePush(stabilizingAreas, seen, item, MAX_PER_GROUP);
  }

  for (const p of startPriorities.primaryPlayers) {
    const name = p.playerName?.trim().split(/\s+/)[0] || p.playerName?.trim() || "Игрок";
    const reason = p.reason?.trim();
    const line = reason && reason !== "—" ? `${name}: ${reason.slice(0, 56)}${reason.length > 56 ? "…" : ""}` : name;
    dedupePush(currentFocus, seen, line, MAX_PER_GROUP);
  }

  for (const d of startPriorities.primaryDomains) {
    const label = d.labelRu?.trim();
    if (!label) continue;
    dedupePush(currentFocus, seen, label, MAX_PER_GROUP);
  }

  if (currentFocus.length === 0 && input.planningFocusDomains?.length) {
    for (const d of input.planningFocusDomains) {
      const label = d.labelRu?.trim();
      if (!label) continue;
      dedupePush(currentFocus, seen, label, MAX_PER_GROUP);
    }
  }

  const total =
    carryFromPreviousCycle.length +
    recurringNow.length +
    stabilizingAreas.length +
    currentFocus.length;

  if (total === 0) return null;

  let confidence: "low" | "moderate" | "high" = "moderate";
  if (input.lowData && !carryForwardSeed && recurringNow.length === 0) {
    confidence = "low";
  } else if (
    carryForwardSeed?.source === "finalize_carry_forward" &&
    carryFromPreviousCycle.length > 0 &&
    currentFocus.length > 0 &&
    (recurringNow.length > 0 || stabilizingAreas.length > 0)
  ) {
    confidence = "high";
  }

  const note =
    "Сводка по уже посчитанным сигналам; детали и источники — в блоках ниже, без отдельной «оценки» результата.";

  return {
    carryFromPreviousCycle,
    recurringNow,
    stabilizingAreas,
    currentFocus,
    confidence,
    note,
  };
}
