/**
 * PHASE 26: rule-based слой «готовность к подтверждению» live training (без score и без блокировки кнопки).
 */

import type {
  LiveTrainingReviewAccelerationCounts,
  LiveTrainingReviewFilterMode,
} from "@/lib/liveTrainingReviewAcceleration";
import type { LiveTrainingReviewSummary } from "@/types/liveTraining";

export type LiveTrainingConfirmReadiness = "ready" | "review_first" | "blocked";

/** Подмножество фильтров review (без all / context_helped). */
export type LiveTrainingConfirmRecommendedFilter = Exclude<
  LiveTrainingReviewFilterMode,
  "all" | "context_helped"
> | null;

export type LiveTrainingConfirmConfidence = {
  readiness: LiveTrainingConfirmReadiness;
  label: string;
  reasons: string[];
  recommendedFilter: LiveTrainingConfirmRecommendedFilter;
};

function pickRecommendedFilter(params: {
  needsReview: number;
  unassigned: number;
  quickFixCount: number;
  broadCategoryCount: number;
}): LiveTrainingConfirmRecommendedFilter {
  if (params.needsReview > 0) return "needs_review";
  if (params.unassigned > 0) return "no_player";
  if (params.quickFixCount >= 2) return "quick_fixes";
  if (params.broadCategoryCount >= 2) return "broad_category";
  return null;
}

function buildReasons(params: {
  toConfirm: number;
  needsReview: number;
  unassigned: number;
  quickFixCount: number;
  broadCategoryCount: number;
  readiness: LiveTrainingConfirmReadiness;
}): string[] {
  const {
    toConfirm,
    needsReview,
    unassigned,
    quickFixCount,
    broadCategoryCount,
    readiness,
  } = params;

  if (readiness === "blocked" && toConfirm === 0) {
    return ["Нет наблюдений в списке к подтверждению."];
  }

  if (readiness === "ready") {
    const out: string[] = [
      "Спорных наблюдений не осталось.",
      "Все наблюдения привязаны к игрокам.",
    ];
    if (broadCategoryCount === 1) {
      out.push("Одна карточка с категорией «общее» — при желании уточните.");
    }
    return out.slice(0, 3);
  }

  const out: string[] = [];

  if (needsReview > 0) {
    out.push(
      needsReview === 1
        ? "Одно наблюдение с пометкой «нужна проверка»."
        : `${needsReview} наблюдений с пометкой «нужна проверка».`
    );
  }
  if (unassigned > 0) {
    out.push(
      unassigned === 1
        ? "Одно наблюдение без игрока в составе."
        : `${unassigned} наблюдений без привязки к игроку.`
    );
  }
  if (broadCategoryCount >= 2) {
    out.push(`Несколько наблюдений с широкой категорией «общее» (${broadCategoryCount}).`);
  }
  if (quickFixCount >= 2) {
    out.push(`Есть быстрые правки на ${quickFixCount} карточках — можно применить до подтверждения.`);
  } else if (quickFixCount === 1 && readiness === "review_first") {
    out.push("На одной карточке доступна быстрая правка.");
  }

  if (readiness === "blocked" && out.length === 0) {
    out.push("Много наблюдений требуют внимания перед подтверждением.");
  }

  return out.slice(0, 3);
}

/**
 * Данные только с review screen: reviewSummary + accelerationCounts.
 */
export function buildLiveTrainingConfirmConfidence(params: {
  reviewSummary: LiveTrainingReviewSummary;
  accelerationCounts: LiveTrainingReviewAccelerationCounts;
}): LiveTrainingConfirmConfidence {
  const { reviewSummary, accelerationCounts } = params;
  const toConfirm = reviewSummary.toConfirmCount;
  const needsReview = reviewSummary.needsReviewCount;
  const unassigned = reviewSummary.unassignedCount;
  const { quickFixCount, broadCategoryCount } = accelerationCounts;
  const riskSum = needsReview + unassigned;

  if (toConfirm === 0) {
    return {
      readiness: "blocked",
      label: "Сейчас подтверждать рано",
      reasons: buildReasons({
        toConfirm,
        needsReview,
        unassigned,
        quickFixCount,
        broadCategoryCount,
        readiness: "blocked",
      }),
      recommendedFilter: null,
    };
  }

  const heavyDispute =
    needsReview >= 3 || unassigned >= 3 || riskSum >= 4;

  if (heavyDispute) {
    return {
      readiness: "blocked",
      label: "Сначала уточните спорные наблюдения",
      reasons: buildReasons({
        toConfirm,
        needsReview,
        unassigned,
        quickFixCount,
        broadCategoryCount,
        readiness: "blocked",
      }),
      recommendedFilter: pickRecommendedFilter({
        needsReview,
        unassigned,
        quickFixCount,
        broadCategoryCount,
      }),
    };
  }

  const hasWeakSpots =
    needsReview > 0 ||
    unassigned > 0 ||
    broadCategoryCount >= 2 ||
    quickFixCount >= 2;

  if (hasWeakSpots) {
    return {
      readiness: "review_first",
      label: "Можно подтверждать, но лучше быстро проверить часть наблюдений",
      reasons: buildReasons({
        toConfirm,
        needsReview,
        unassigned,
        quickFixCount,
        broadCategoryCount,
        readiness: "review_first",
      }),
      recommendedFilter: pickRecommendedFilter({
        needsReview,
        unassigned,
        quickFixCount,
        broadCategoryCount,
      }),
    };
  }

  return {
    readiness: "ready",
    label: "Можно уверенно подтверждать",
    reasons: buildReasons({
      toConfirm,
      needsReview,
      unassigned,
      quickFixCount,
      broadCategoryCount,
      readiness: "ready",
    }),
    recommendedFilter: null,
  };
}
