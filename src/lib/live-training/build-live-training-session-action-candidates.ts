/**
 * PHASE 15: кандидаты действий по итогам одной подтверждённой сессии (on-read).
 */

import { domainToActionType, sortLiveTrainingActionCandidates } from "./live-training-action-candidate-rules";
import type { LiveTrainingActionCandidateDto } from "./live-training-action-candidate-types";
import type { LiveTrainingSessionOutcomeDto } from "./live-training-session-outcome";
import { liveTrainingMetricDomainLabelRu } from "./player-live-training-signals-labels";

function pushUnique(
  bucket: LiveTrainingActionCandidateDto[],
  item: LiveTrainingActionCandidateDto,
  seen: Set<string>
): void {
  if (seen.has(item.id)) return;
  seen.add(item.id);
  bucket.push(item);
}

export function buildLiveTrainingSessionActionCandidates(
  outcome: LiveTrainingSessionOutcomeDto,
  sessionId: string,
  sessionStartedAt: string
): LiveTrainingActionCandidateDto[] {
  const seen = new Set<string>();
  const out: LiveTrainingActionCandidateDto[] = [];

  if (outcome.signalsCreatedCount === 0) return [];

  const top = outcome.topPlayers;

  if (outcome.draftsFlaggedNeedsReview > 0 && top[0]) {
    const p = top[0];
    pushUnique(
      out,
      {
        id: `ltac:s:${sessionId}:p:${p.playerId}:review`,
        playerId: p.playerId,
        playerName: p.playerName,
        source: "live_training",
        actionType: "follow_up_check",
        title: "Проверить на следующей тренировке",
        body: `В этой сессии остались наблюдения с пометкой «требует проверки» (${outcome.draftsFlaggedNeedsReview}). Перепроверьте формулировки до следующей фиксации.`,
        tone: "attention",
        priority: "high",
        basedOn: {
          signalCount: p.totalSignals,
          domains: [...outcome.topDomains],
          lastSessionAt: sessionStartedAt,
        },
      },
      seen
    );
  }

  for (const p of top.slice(0, 4)) {
    if (out.length >= 5) break;
    const primaryDomain = p.topDomains[0] ?? "general";
    const domainLabel = liveTrainingMetricDomainLabelRu(primaryDomain);

    if (p.negativeCount >= 2) {
      const at = domainToActionType(primaryDomain);
      const title =
        at === "monitor_technique"
          ? "Наблюдать за техникой"
          : at === "monitor_effort"
            ? "Наблюдать за старанием"
            : "Наблюдать за вниманием";
      pushUnique(
        out,
        {
          id: `ltac:s:${sessionId}:p:${p.playerId}:${at}`,
          playerId: p.playerId,
          playerName: p.playerName,
          source: "live_training",
          actionType: at,
          title,
          body: `По итогам этой тренировки: ${p.negativeCount} отметок «внимание» при ${p.totalSignals} сигналах. Доминантная тема: ${domainLabel}. Оставить в фокусе на следующей тренировке.`,
          tone: "attention",
          priority: p.negativeCount >= 3 ? "high" : "medium",
          basedOn: {
            signalCount: p.totalSignals,
            domains: [...p.topDomains],
            lastSessionAt: sessionStartedAt,
          },
        },
        seen
      );
    } else if (p.negativeCount === 1 && p.totalSignals >= 4) {
      pushUnique(
        out,
        {
          id: `ltac:s:${sessionId}:p:${p.playerId}:focus_next`,
          playerId: p.playerId,
          playerName: p.playerName,
          source: "live_training",
          actionType: "focus_next_training",
          title: "Оставить в фокусе",
          body: `Насыщенная сессия (${p.totalSignals} сигналов): есть точка внимания по теме «${domainLabel}». Проверить на следующей тренировке.`,
          tone: "neutral",
          priority: "medium",
          basedOn: {
            signalCount: p.totalSignals,
            domains: [...p.topDomains],
            lastSessionAt: sessionStartedAt,
          },
        },
        seen
      );
    }

    if (p.positiveCount >= 2 && p.negativeCount === 0 && out.length < 5) {
      pushUnique(
        out,
        {
          id: `ltac:s:${sessionId}:p:${p.playerId}:reinforce`,
          playerId: p.playerId,
          playerName: p.playerName,
          source: "live_training",
          actionType: "reinforce_positive",
          title: "Закрепить позитивный результат",
          body: `В этой тренировке у игрока нет отметок «внимание» при заметной выборке (+${p.positiveCount} позитивных). Имеет смысл закрепить на следующей тренировке.`,
          tone: "positive",
          priority: "low",
          basedOn: {
            signalCount: p.totalSignals,
            domains: [...p.topDomains],
            lastSessionAt: sessionStartedAt,
          },
        },
        seen
      );
    }
  }

  if (
    outcome.affectedPlayersCount >= 3 &&
    outcome.signalsCreatedCount >= 6 &&
    top[0] &&
    out.length < 5
  ) {
    pushUnique(
      out,
      {
        id: `ltac:s:${sessionId}:multi:follow_up`,
        playerId: top[0].playerId,
        playerName: top[0].playerName,
        source: "live_training",
        actionType: "follow_up_check",
        title: "Проверить на следующей тренировке",
        body: `Несколько игроков с насыщенной выборкой сигналов (${outcome.affectedPlayersCount} игроков, ${outcome.signalsCreatedCount} сигналов). Коротко пройдитесь по ключевым лицам.`,
        tone: "neutral",
        priority: "medium",
        basedOn: {
          signalCount: outcome.signalsCreatedCount,
          domains: [...outcome.topDomains],
          lastSessionAt: sessionStartedAt,
        },
      },
      seen
    );
  }

  return sortLiveTrainingActionCandidates(out, 5);
}
