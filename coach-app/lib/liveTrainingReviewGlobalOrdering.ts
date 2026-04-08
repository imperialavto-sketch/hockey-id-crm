/**
 * PHASE 38: единый глобальный приоритет карточек review (для сортировки и будущего guided flow).
 */

import { buildLiveTrainingDraftReviewStrategy } from "@/lib/liveTrainingDraftReviewStrategy";
import type { LiveTrainingObservationDraft } from "@/types/liveTraining";

/** 1 = срочнее всего … 6 = можно отложить */
export type LiveTrainingGlobalReviewPriorityGroup = 1 | 2 | 3 | 4 | 5 | 6;

export type LiveTrainingDraftGlobalReviewOrder = {
  globalReviewPriorityGroup: LiveTrainingGlobalReviewPriorityGroup;
  /** Больше = выше в списке при сортировке DESC */
  globalReviewRank: number;
};

export type LiveTrainingGlobalOrderingEntry = LiveTrainingDraftGlobalReviewOrder & {
  draftId: string;
};

/** Снимок глобального порядка по всем черновикам сессии (для фильтров / будущего guided flow). */
export function buildLiveTrainingReviewGlobalOrdering(
  drafts: LiveTrainingObservationDraft[]
): LiveTrainingGlobalOrderingEntry[] {
  return drafts.map((d) => ({ draftId: d.id, ...getDraftGlobalReviewOrder(d) }));
}

/**
 * Группы:
 * 1 — open_and_check + needsReview
 * 2 — open_and_check без needsReview (в т.ч. без игрока / смешанные подсказки)
 * 3 — quick_apply (сильные подсказки)
 * 4 — есть подсказки, но не путь quick_apply (мягче)
 * 5 — review_later без подсказок
 * 6 — ready_as_is
 */
export function getDraftGlobalReviewOrder(draft: LiveTrainingObservationDraft): LiveTrainingDraftGlobalReviewOrder {
  const strat = buildLiveTrainingDraftReviewStrategy(draft);
  const hasSug = (draft.correctionSuggestions?.length ?? 0) > 0;

  let group: LiveTrainingGlobalReviewPriorityGroup;
  if (strat.strategy === "open_and_check") {
    group = draft.needsReview ? 1 : 2;
  } else if (strat.strategy === "quick_apply") {
    group = 3;
  } else if (hasSug) {
    group = 4;
  } else if (strat.strategy === "review_later") {
    group = 5;
  } else {
    group = 6;
  }

  const globalReviewRank = (7 - group) * 100 + strat.strategyRank;
  return { globalReviewPriorityGroup: group, globalReviewRank };
}

export function sortDraftsByGlobalReviewRankDesc(drafts: LiveTrainingObservationDraft[]): LiveTrainingObservationDraft[] {
  if (drafts.length <= 1) return [...drafts];
  const decorated = drafts.map((d) => ({ d, ...getDraftGlobalReviewOrder(d) }));
  decorated.sort((a, b) => b.globalReviewRank - a.globalReviewRank);
  return decorated.map((x) => x.d);
}
