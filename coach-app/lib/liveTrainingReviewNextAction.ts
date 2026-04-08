/**
 * PHASE 37: session-level next-best-action для экрана review (без wizard, без API).
 * PHASE 38: учёт локального прогресса захода (touched / quickApplied).
 */

import { buildLiveTrainingDraftReviewStrategy } from "@/lib/liveTrainingDraftReviewStrategy";
import type {
  LiveTrainingReviewAccelerationCounts,
  LiveTrainingReviewFilterMode,
} from "@/lib/liveTrainingReviewAcceleration";
import type { LiveTrainingObservationDraft, LiveTrainingReviewSummary } from "@/types/liveTraining";

export type LiveTrainingReviewNextActionTarget = Exclude<LiveTrainingReviewFilterMode, "all">;

export type LiveTrainingReviewNextAction = {
  primaryAction: string;
  secondaryAction?: string;
  targetFilter?: LiveTrainingReviewNextActionTarget;
  remaining?: number;
};

/** Локальный прогресс одного захода на экран review (не БД). */
export type LiveTrainingReviewSessionProgress = {
  /** Карточку закрыли в модалке (просмотрели форму) */
  touchedDraftIds: ReadonlySet<string>;
  /** Успешный quick-apply (chip) в этом заходе */
  quickAppliedDraftIds: ReadonlySet<string>;
};

function isTouched(progress: LiveTrainingReviewSessionProgress | null | undefined, id: string): boolean {
  return Boolean(progress?.touchedDraftIds.has(id));
}

function isQuickApplied(progress: LiveTrainingReviewSessionProgress | null | undefined, id: string): boolean {
  return Boolean(progress?.quickAppliedDraftIds.has(id));
}

/**
 * Приоритет шагов с учётом «осталось в проходе»: needsReview → no_player → quick_apply → остальные quick_fixes → мало карточек → confirm.
 * Без `progress` ведёт себя как PHASE 37.
 */
export function buildLiveTrainingReviewNextAction(params: {
  drafts: LiveTrainingObservationDraft[];
  reviewSummary: LiveTrainingReviewSummary;
  accelerationCounts: LiveTrainingReviewAccelerationCounts;
  progress?: LiveTrainingReviewSessionProgress | null;
}): LiveTrainingReviewNextAction | null {
  const { drafts, reviewSummary, accelerationCounts, progress } = params;
  if (drafts.length === 0) return null;

  const { needsReviewCount, unassignedCount, toConfirmCount } = reviewSummary;
  const { quickFixCount, totalCount } = accelerationCounts;

  const strategies = drafts.map((d) => ({
    draft: d,
    strategy: buildLiveTrainingDraftReviewStrategy(d),
  }));

  const needsReviewDrafts = drafts.filter((d) => d.needsReview);
  const needsReviewPending = needsReviewDrafts.filter((d) => !isTouched(progress, d.id));
  if (needsReviewPending.length > 0) {
    return {
      primaryAction: "Начните с наблюдений, требующих проверки",
      secondaryAction:
        needsReviewPending.length === 1
          ? "Осталась 1 карточка с пометкой проверки в этом проходе"
          : `Осталось разобрать в проходе: ${needsReviewPending.length}`,
      targetFilter: "needs_review",
      remaining: needsReviewPending.length,
    };
  }

  const unassignedDrafts = drafts.filter((d) => d.playerId == null);
  const unassignedPending = unassignedDrafts.filter((d) => !isTouched(progress, d.id));
  if (unassignedCount > 0 && unassignedPending.length > 0) {
    return {
      primaryAction: "Дальше — наблюдения без привязки к игроку",
      secondaryAction:
        unassignedPending.length === 1
          ? "Одна карточка без игрока ещё не открыта в проходе"
          : `Без игрока, не открыты в проходе: ${unassignedPending.length}`,
      targetFilter: "no_player",
      remaining: unassignedPending.length,
    };
  }

  const quickApplyDrafts = strategies.filter((x) => x.strategy.strategy === "quick_apply").map((x) => x.draft);
  const quickApplyPending = quickApplyDrafts.filter((d) => !isQuickApplied(progress, d.id));
  if (quickApplyPending.length > 0) {
    return {
      primaryAction: "Можно быстро уточнить часть наблюдений",
      secondaryAction:
        quickApplyPending.length === 1
          ? "Осталась 1 сильная подсказка без быстрого применения"
          : `Сильные подсказки без chip: ${quickApplyPending.length} из ${totalCount}`,
      targetFilter: "quick_fixes",
      remaining: quickApplyPending.length,
    };
  }

  const draftsWithSuggestions = drafts.filter((d) => (d.correctionSuggestions?.length ?? 0) > 0);
  const suggestionsPending = draftsWithSuggestions.filter((d) => !isQuickApplied(progress, d.id));
  if (quickFixCount > 0 && suggestionsPending.length > 0) {
    return {
      primaryAction: "Пройдитесь по быстрым правкам",
      secondaryAction: "Подсказки мягче — загляните в фильтр",
      targetFilter: "quick_fixes",
      remaining: suggestionsPending.length,
    };
  }

  if (toConfirmCount > 0 && totalCount > 0 && totalCount <= 4) {
    return {
      primaryAction: "Просмотрите наблюдения перед подтверждением",
      secondaryAction: "Мало карточек — быстрый проход по смыслу",
    };
  }

  if (toConfirmCount > 0) {
    const touchedN = progress?.touchedDraftIds.size ?? 0;
    const qaN = progress?.quickAppliedDraftIds.size ?? 0;
    const extra =
      touchedN + qaN > 0
        ? "В проходе уже были просмотры и быстрые правки — можно завершать"
        : "Очереди проверки и быстрых правок пусты";
    return {
      primaryAction: "Можно переходить к подтверждению",
      secondaryAction: extra,
    };
  }

  return {
    primaryAction: "Просмотрите список перед подтверждением",
  };
}
