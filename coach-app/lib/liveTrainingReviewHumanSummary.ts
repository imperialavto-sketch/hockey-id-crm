/**
 * PHASE 25: короткая человекочитаемая сводка перед подтверждением live training (rule-based, без LLM).
 */

import type { LiveTrainingReviewAccelerationCounts } from "@/lib/liveTrainingReviewAcceleration";
import type { LiveTrainingPreConfirmSummary, LiveTrainingReviewSummary } from "@/types/liveTraining";

export type LiveTrainingReviewHumanSummaryTone = "ready" | "mixed" | "attention";

export type LiveTrainingReviewHumanSummary = {
  headline: string;
  lines: string[];
  tone: LiveTrainingReviewHumanSummaryTone;
  /** Короткие акценты (опционально). */
  highlights?: string[];
  /** Мягкая подсказка «что сделать дальше» при tone=attention. */
  nudge?: string;
};

function ruObservationsPhrase(n: number, form: "nominative" | "genitive"): string {
  const k = n % 10;
  const k100 = n % 100;
  if (form === "nominative") {
    if (k === 1 && k100 !== 11) return `${n} наблюдение`;
    if (k >= 2 && k <= 4 && (k100 < 12 || k100 > 14)) return `${n} наблюдения`;
    return `${n} наблюдений`;
  }
  /** Родительный множественного: «у пяти наблюдений». */
  return `${n} наблюдений`;
}

function headlineAndTone(params: {
  toConfirm: number;
  needsReview: number;
  unassigned: number;
}): { headline: string; tone: LiveTrainingReviewHumanSummaryTone } {
  const { toConfirm, needsReview, unassigned } = params;
  const risk = needsReview + unassigned;

  if (toConfirm <= 0) {
    return {
      headline: "Наблюдений для подтверждения сейчас нет",
      tone: "mixed",
    };
  }

  if (risk === 0) {
    return {
      headline: "Почти всё готово к подтверждению",
      tone: "ready",
    };
  }

  const heavyAttention =
    needsReview >= 2 ||
    unassigned >= 2 ||
    (needsReview >= 1 && unassigned >= 1) ||
    risk >= 3;

  if (heavyAttention) {
    return {
      headline: "Есть наблюдения, которые лучше уточнить перед подтверждением",
      tone: "attention",
    };
  }

  return {
    headline: "Перед подтверждением стоит быстро проверить часть наблюдений",
    tone: "mixed",
  };
}

function buildNudge(params: {
  tone: LiveTrainingReviewHumanSummaryTone;
  needsReview: number;
  unassigned: number;
  quickFix: number;
}): string | undefined {
  if (params.tone !== "attention") return undefined;
  if (params.unassigned > 0) {
    return "Сначала удобно пройти фильтр «Без игрока».";
  }
  if (params.quickFix > 0) {
    return "Можно начать с фильтра «Быстрые правки».";
  }
  if (params.needsReview > 0) {
    return "Начните с фильтра «Требует проверки».";
  }
  return undefined;
}

/**
 * 2–4 строки фактов + опционально highlights; без длинных абзацев.
 */
export function buildLiveTrainingReviewHumanSummary(params: {
  reviewSummary: LiveTrainingReviewSummary;
  preConfirmSummary: LiveTrainingPreConfirmSummary;
  accelerationCounts: LiveTrainingReviewAccelerationCounts;
}): LiveTrainingReviewHumanSummary {
  const { reviewSummary, preConfirmSummary, accelerationCounts } = params;
  const toConfirm = reviewSummary.toConfirmCount;
  const needsReview = reviewSummary.needsReviewCount;
  const unassigned = reviewSummary.unassignedCount;
  const { quickFixCount, contextHelpedCount, broadCategoryCount } = accelerationCounts;

  const { headline, tone } = headlineAndTone({ toConfirm, needsReview, unassigned });

  const lines: string[] = [];

  if (toConfirm > 0) {
    lines.push(`Сейчас к подтверждению ${ruObservationsPhrase(toConfirm, "nominative")}.`);
  }

  if (needsReview > 0) {
    lines.push(
      needsReview === 1
        ? "Одно наблюдение помечено «нужна проверка»."
        : `${ruObservationsPhrase(needsReview, "nominative")} помечены «нужна проверка».`
    );
  }

  if (unassigned > 0) {
    lines.push(
      unassigned === 1
        ? "Одно наблюдение без привязки к игроку в составе."
        : `Без привязки к игроку: ${ruObservationsPhrase(unassigned, "nominative")}.`
    );
  }

  const top = preConfirmSummary.topDraftPlayers.filter((p) => p.draftCount > 0).slice(0, 2);
  if (top.length >= 2) {
    lines.push(`Сейчас чаще всего речь о ${top[0]!.playerName} и ${top[1]!.playerName}.`);
  } else if (top.length === 1) {
    lines.push(`Сейчас чаще всего речь о ${top[0]!.playerName}.`);
  }

  if (quickFixCount > 0) {
    lines.push(
      quickFixCount === 1
        ? "Для одного наблюдения на карточке есть быстрая правка одним нажатием."
        : `Для ${ruObservationsPhrase(quickFixCount, "genitive")} на карточке есть быстрые правки одним нажатием.`
    );
  }

  if (contextHelpedCount > 0) {
    lines.push(`Подсказки по плану тренировки: ${ruObservationsPhrase(contextHelpedCount, "nominative")}.`);
  }

  if (broadCategoryCount > 0) {
    lines.push(
      `У ${ruObservationsPhrase(broadCategoryCount, "genitive")} стоит широкая категория «общее» — при желании уточните.`
    );
  }

  let trimmed = lines.slice(0, 4);
  if (trimmed.length === 0 && toConfirm <= 0) {
    trimmed = ["Чтобы подтвердить тренировку, нужны наблюдения в списке ниже."];
  }

  const highlights: string[] = [];
  if (toConfirm > 0 && needsReview === 0 && unassigned === 0 && quickFixCount > 0) {
    highlights.push("Можно применить быстрые правки там, где они есть.");
  }

  const nudge = buildNudge({ tone, needsReview, unassigned, quickFix: quickFixCount });

  return {
    headline,
    lines: trimmed,
    tone,
    highlights: highlights.length > 0 ? highlights : undefined,
    nudge,
  };
}
