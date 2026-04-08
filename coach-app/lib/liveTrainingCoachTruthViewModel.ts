/**
 * Coach truth layer: честные агрегаты «что вошло в систему» без LLM (outcome + action candidates).
 */

import type { LiveTrainingActionCandidate } from "@/services/liveTrainingService";
import type { LiveTrainingSessionOutcome } from "@/types/liveTraining";

/** Компактный контракт для блока «итог обработки» на complete. */
export type LiveTrainingCoachTruthSummary = {
  /** LiveTrainingPlayerSignal по сессии — канонически «в карточке игрока». */
  playerSignalsCreated: number;
  /** Подтверждённые черновики с целью «игрок» (категория не team/session). */
  playerObservationsIncluded: number;
  playerLinkedObservationCount: number;
  playerObservationUnlinkedCount: number;
  teamObservationsIncluded: number;
  sessionObservationsIncluded: number;
  excludedObservationsCount: number;
  needsReviewDraftCount: number;
  /** Уникальные черновики, требующие внимания тренера (сервер; на старом API — оценка). */
  needsManualAttentionCount: number;
  materializedActionCount: number;
  pendingActionCount: number;
  totalActionCandidates: number;
  coachHints: string[];
};

function collectCoachHints(t: Omit<LiveTrainingCoachTruthSummary, "coachHints">): string[] {
  const hints: string[] = [];
  const { playerObservationUnlinkedCount, needsReviewDraftCount } = t;

  if (playerObservationUnlinkedCount > 0 && needsReviewDraftCount > 0) {
    hints.push(
      "Часть наблюдений не попала в карточки игроков или помечена на проверку — просмотри вручную."
    );
  } else if (playerObservationUnlinkedCount > 0) {
    hints.push(
      "Часть наблюдений по игрокам без привязки к карточке — сигналы по ним не строятся, пока не уточнишь игрока."
    );
  } else if (needsReviewDraftCount > 0) {
    hints.push("Есть наблюдения с пометкой «на проверку» — при необходимости уточни формулировки.");
  }

  if (
    t.playerSignalsCreated === 0 &&
    t.playerObservationsIncluded > 0 &&
    playerObservationUnlinkedCount === 0 &&
    needsReviewDraftCount === 0
  ) {
    hints.push(
      "Сигналы не созданы при наличии игроковых наблюдений — проверь цепочку подтверждения или привязку."
    );
  }

  return hints.slice(0, 3);
}

export function buildLiveTrainingCoachTruthSummary(input: {
  outcome: LiveTrainingSessionOutcome;
  actionCandidates?: LiveTrainingActionCandidate[];
}): LiveTrainingCoachTruthSummary {
  const { outcome, actionCandidates = [] } = input;
  const materializedActionCount = actionCandidates.filter((c) => Boolean(c.isMaterialized)).length;
  const pendingActionCount = actionCandidates.filter((c) => !c.isMaterialized).length;
  const needsManualAttentionCount = outcome.manualAttentionDraftsCount;

  const core = {
    playerSignalsCreated: outcome.signalsCreatedCount,
    playerObservationsIncluded: outcome.playerObservationCount,
    playerLinkedObservationCount: outcome.playerLinkedObservationCount,
    playerObservationUnlinkedCount: outcome.playerObservationUnlinkedCount,
    teamObservationsIncluded: outcome.teamObservationCount,
    sessionObservationsIncluded: outcome.sessionObservationCount,
    excludedObservationsCount: outcome.excludedDraftsCount,
    needsReviewDraftCount: outcome.draftsFlaggedNeedsReview,
    needsManualAttentionCount,
    materializedActionCount,
    pendingActionCount,
    totalActionCandidates: actionCandidates.length,
  };

  return {
    ...core,
    coachHints: collectCoachHints(core),
  };
}
