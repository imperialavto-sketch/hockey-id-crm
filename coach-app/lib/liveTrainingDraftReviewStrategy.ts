/**
 * PHASE 36: rule-based item-level стратегия для карточки review (без LLM, без auto-apply).
 */

import type {
  LiveTrainingDraftCorrectionSuggestion,
  LiveTrainingObservationDraft,
} from "@/types/liveTraining";

export type LiveTrainingDraftReviewStrategyKind =
  | "quick_apply"
  | "open_and_check"
  | "ready_as_is"
  | "review_later";

export type LiveTrainingDraftReviewStrategyTone = "positive" | "neutral" | "attention";

export type LiveTrainingDraftReviewStrategy = {
  strategy: LiveTrainingDraftReviewStrategyKind;
  label: string;
  tone: LiveTrainingDraftReviewStrategyTone;
  reason?: string;
  /**
   * Скрытый приоритет для будущей сортировки карточек (больше = срочнее).
   * PHASE 36: не используется для порядка списка на экране.
   */
  strategyRank: number;
};

type PriorityTier = "high" | "medium" | "low";

function effectiveSuggestionPriority(
  p: LiveTrainingDraftCorrectionSuggestion["suggestionPriority"]
): PriorityTier {
  if (p === "high" || p === "low") return p;
  return "medium";
}

function normalizeSuggestionPriorities(draft: LiveTrainingObservationDraft): PriorityTier[] {
  const list = draft.correctionSuggestions ?? [];
  return list.map((s) => effectiveSuggestionPriority(s.suggestionPriority));
}

export function buildLiveTrainingDraftReviewStrategy(draft: LiveTrainingObservationDraft): LiveTrainingDraftReviewStrategy {
  const suggestions = draft.correctionSuggestions ?? [];
  const hasAny = suggestions.length > 0;
  const tiers = normalizeSuggestionPriorities(draft);
  const hasHigh = tiers.some((t) => t === "high");
  const prioritySet = new Set(tiers);
  const mixedPriorityTiers = prioritySet.size >= 2;

  const hasPlayer = draft.playerId != null;
  const highPlayerSuggestion = suggestions.some(
    (s) => s.suggestionType === "player" && effectiveSuggestionPriority(s.suggestionPriority) === "high"
  );

  const needsOpenAndCheck =
    draft.needsReview ||
    (!hasPlayer && !highPlayerSuggestion) ||
    mixedPriorityTiers;

  if (needsOpenAndCheck) {
    const rank = draft.needsReview ? 100 : 82;
    if (draft.needsReview) {
      return {
        strategy: "open_and_check",
        label: "Лучше проверить вручную",
        tone: "attention",
        reason: "Отмечено для проверки",
        strategyRank: rank,
      };
    }
    if (mixedPriorityTiers) {
      return {
        strategy: "open_and_check",
        label: "Лучше проверить вручную",
        tone: "attention",
        reason: "Разные по силе подсказки — сверьте вместе",
        strategyRank: rank,
      };
    }
    return {
      strategy: "open_and_check",
      label: "Лучше проверить вручную",
      tone: "attention",
      reason: "Нужна привязка к игроку или правка в форме",
      strategyRank: rank,
    };
  }

  const canQuickApply =
    hasHigh &&
    !mixedPriorityTiers &&
    (hasPlayer || highPlayerSuggestion);

  if (canQuickApply) {
    return {
      strategy: "quick_apply",
      label: "Можно быстро уточнить",
      tone: "positive",
      reason: "Есть сильная подсказка по разбору",
      strategyRank: 68,
    };
  }

  if (!draft.needsReview && !hasAny && hasPlayer) {
    return {
      strategy: "ready_as_is",
      label: "Можно оставить как есть",
      tone: "neutral",
      strategyRank: 28,
    };
  }

  return {
    strategy: "review_later",
    label: "Можно вернуться позже",
    tone: "neutral",
    strategyRank: 44,
  };
}

/** PHASE 37: один раз считает strategyRank на черновик, сортировка по убыванию срочности. */
export function sortDraftsByStrategyRankDesc(drafts: LiveTrainingObservationDraft[]): LiveTrainingObservationDraft[] {
  if (drafts.length <= 1) return [...drafts];
  const decorated = drafts.map((d) => ({
    d,
    rank: buildLiveTrainingDraftReviewStrategy(d).strategyRank,
  }));
  decorated.sort((a, b) => b.rank - a.rank);
  return decorated.map((x) => x.d);
}
