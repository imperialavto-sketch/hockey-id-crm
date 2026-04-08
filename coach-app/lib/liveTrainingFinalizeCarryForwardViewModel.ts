/**
 * Экран завершения: эвристики «что можно удержать» из отчётного planning snapshot.
 * Не переносит ничего в финальный отчёт и не утверждает достижение целей.
 */

import {
  buildLiveTrainingReviewReportPlanningVm,
  type LiveTrainingReviewReportPlanningLineVm,
} from "@/lib/liveTrainingReviewReportPlanningContext";
import type { LiveTrainingPlanningSnapshot } from "@/types/liveTraining";

export type LiveTrainingFinalizeCarryForwardLineVm = {
  primary: string;
  secondary?: string;
};

export type LiveTrainingFinalizeCarryForwardVm = {
  worthRechecking: LiveTrainingFinalizeCarryForwardLineVm[];
  possibleCarryForward: LiveTrainingFinalizeCarryForwardLineVm[];
  optionalContextOnly: string[];
};

const MAX_WORTH = 4;
const MAX_CARRY = 5;
const MAX_CONTEXT_LINES = 4;
const MAX_CONTEXT_SEEDS = 3;

function normPrimary(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function seedLooksLowConfidence(text: string): boolean {
  const t = text.toLowerCase();
  return /проверка|маловер|низк|возможно|условно|мало данных|\?/.test(t);
}

function lineVmToCarry(line: LiveTrainingReviewReportPlanningLineVm): LiveTrainingFinalizeCarryForwardLineVm {
  return { primary: line.primary, secondary: line.secondary };
}

/**
 * null — нет трассируемого контекста отчётов в снимке (экран как раньше).
 */
export function buildLiveTrainingFinalizeCarryForwardVm(
  snap: LiveTrainingPlanningSnapshot | null | undefined
): LiveTrainingFinalizeCarryForwardVm | null {
  const base = buildLiveTrainingReviewReportPlanningVm(snap);
  if (!base) return null;

  const focusNorms = new Map<string, LiveTrainingReviewReportPlanningLineVm>();
  for (const f of base.focusFromReports) {
    const k = normPrimary(f.primary);
    if (k) focusNorms.set(k, f);
  }
  const reinforceNorms = new Map<string, LiveTrainingReviewReportPlanningLineVm>();
  for (const r of base.reinforceFromReports) {
    const k = normPrimary(r.primary);
    if (k) reinforceNorms.set(k, r);
  }

  const intersectionKeys = [...focusNorms.keys()].filter((k) => reinforceNorms.has(k));

  const worthRechecking: LiveTrainingFinalizeCarryForwardLineVm[] = [];
  for (const k of intersectionKeys) {
    if (worthRechecking.length >= MAX_WORTH) break;
    const f = focusNorms.get(k);
    if (!f) continue;
    worthRechecking.push({
      primary: f.primary,
      secondary:
        "В плане тема отмечена и в фокусе, и в закреплении — имеет смысл сверить на следующем старте.",
    });
  }

  const worthKeys = new Set(intersectionKeys);
  const possibleCarryForward: LiveTrainingFinalizeCarryForwardLineVm[] = [];

  const pushCarry = (line: LiveTrainingReviewReportPlanningLineVm) => {
    if (possibleCarryForward.length >= MAX_CARRY) return;
    possibleCarryForward.push(lineVmToCarry(line));
  };

  for (const f of base.focusFromReports) {
    if (possibleCarryForward.length >= MAX_CARRY) break;
    const k = normPrimary(f.primary);
    if (!k || worthKeys.has(k)) continue;
    pushCarry(f);
  }
  for (const r of base.reinforceFromReports) {
    if (possibleCarryForward.length >= MAX_CARRY) break;
    const k = normPrimary(r.primary);
    if (!k || worthKeys.has(k)) continue;
    pushCarry(r);
  }

  const optionalContextOnly: string[] = [];
  for (const line of base.reportSummaryLines) {
    if (optionalContextOnly.length >= MAX_CONTEXT_LINES) break;
    const t = line.trim();
    if (t) optionalContextOnly.push(t.length > 240 ? `${t.slice(0, 237)}…` : t);
  }

  let lowConfSeedCount = 0;
  for (const seed of base.seedLines) {
    if (seedLooksLowConfidence(seed)) {
      if (lowConfSeedCount >= MAX_CONTEXT_SEEDS) continue;
      lowConfSeedCount += 1;
      optionalContextOnly.push(seed.length > 220 ? `${seed.slice(0, 217)}…` : seed);
    } else if (possibleCarryForward.length < MAX_CARRY) {
      possibleCarryForward.push({
        primary: seed,
        secondary: "Краткая трасса из отчётов — не обязательный пункт следующего плана.",
      });
    }
  }

  return {
    worthRechecking,
    possibleCarryForward,
    optionalContextOnly,
  };
}

export const LIVE_TRAINING_FINALIZE_CARRY_FORWARD_COPY = {
  sectionTitle: "Что можно удержать дальше",
  sectionSub:
    "Ориентиры из отчётов, которые были в плане до этой тренировки. Решение за вами: ничего не попадает в отчёт автоматически и не означает «сделано» или «не сделано».",
  worthKicker: "Стоит ещё раз сверить",
  carryKicker: "Ориентиры для следующего цикла",
  contextKicker: "Только контекст плана",
  hintObservations: "Можно сверить с тем, что попало в подтверждённые наблюдения — совпадения и расхождения оба нормальны.",
  hintCycle:
    "Если тема снова проявится на льду, её можно удержать в плане следующего цикла; если нет — спокойно отпустить.",
  emptyGroupHint: "Отдельных эвристик нет — смотрите блок контекста ниже или опирайтесь на сигналы и задачи выше.",
} as const;
