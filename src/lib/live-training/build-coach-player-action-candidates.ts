/**
 * PHASE 15: кандидаты действий по игроку из bundle сигналов / тренда (on-read).
 */

import { prisma } from "@/lib/prisma";
import type { PlayerLiveTrainingSignalsBundleDto } from "./get-coach-player-live-training-signals";
import { getPlayerLiveTrainingSignalsBundle } from "./get-coach-player-live-training-signals";
import { domainToActionType, sortLiveTrainingActionCandidates } from "./live-training-action-candidate-rules";
import type {
  LiveTrainingActionCandidateDto,
  LiveTrainingActionCandidatesResponse,
} from "./live-training-action-candidate-types";

function pushUnique(
  bucket: LiveTrainingActionCandidateDto[],
  item: LiveTrainingActionCandidateDto,
  seen: Set<string>
): void {
  if (seen.has(item.id)) return;
  seen.add(item.id);
  bucket.push(item);
}

export function buildCoachPlayerLiveTrainingActionCandidates(
  playerId: string,
  playerName: string,
  bundle: PlayerLiveTrainingSignalsBundleDto
): LiveTrainingActionCandidateDto[] {
  const seen = new Set<string>();
  const out: LiveTrainingActionCandidateDto[] = [];
  const { summary, trendSummary, timeline } = bundle;
  const lastAt =
    summary.lastSignalAt ?? timeline[0]?.startedAt ?? timeline[0]?.lastSignalAt ?? null;

  if (summary.totalSignals === 0) return [];

  for (const area of trendSummary.repeatedAttentionAreas.slice(0, 2)) {
    const actionType = domainToActionType(area.metricDomain);
    const domainLabel = area.domainLabelRu;
    const pri: "high" | "medium" = area.negativeCount >= 3 ? "high" : "medium";
    let title = "";
    let body = "";
    if (actionType === "monitor_effort") {
      title = "Наблюдать за старанием";
      body = `В последних подтверждённых наблюдениях тема «${domainLabel}» несколько раз отмечена как требующая внимания (${area.negativeCount} в окне). Проверить на следующей тренировке.`;
    } else if (actionType === "monitor_technique") {
      title = "Наблюдать за техникой";
      body = `Повторяющиеся отметки по «${domainLabel}» (${area.negativeCount}). Оставить в фокусе на следующей тренировке.`;
    } else {
      title = "Наблюдать за вниманием";
      body = `Повторяющееся внимание к теме «${domainLabel}» (${area.negativeCount} отметок в окне). Проверить на следующей тренировке.`;
    }
    pushUnique(
      out,
      {
        id: `ltac:p:${playerId}:${actionType}:${area.metricDomain}`,
        playerId,
        playerName,
        source: "live_training",
        actionType,
        title,
        body,
        tone: "attention",
        priority: pri,
        basedOn: {
          signalCount: summary.totalSignals,
          domains: [area.metricDomain],
          lastSessionAt: lastAt,
        },
      },
      seen
    );
  }

  const strongPos = trendSummary.dominantPositiveDomains.filter((d) => d.count >= 2);
  if (strongPos.length > 0) {
    const labels = strongPos.map((d) => d.domainLabelRu).join(", ");
    const domains = strongPos.map((d) => d.metricDomain);
    pushUnique(
      out,
      {
        id: `ltac:p:${playerId}:reinforce_positive:${domains.join("+")}`,
        playerId,
        playerName,
        source: "live_training",
        actionType: "reinforce_positive",
        title: "Закрепить позитивный результат",
        body: `В окне последних сигналов устойчивые позитивные отметки по темам: ${labels}. Имеет смысл закрепить на следующей тренировке.`,
        tone: "positive",
        priority: "medium",
        basedOn: {
          signalCount: summary.totalSignals,
          domains,
          lastSessionAt: lastAt,
        },
      },
      seen
    );
  }

  const heavy = timeline.find((t) => t.totalSignals >= 4);
  if (heavy && out.length < 5) {
    pushUnique(
      out,
      {
        id: `ltac:p:${playerId}:follow_up_check:${heavy.sessionId}`,
        playerId,
        playerName,
        source: "live_training",
        actionType: "follow_up_check",
        title: "Проверить на следующей тренировке",
        body: `В одной из последних тренировок у этого игрока собрано ${heavy.totalSignals} сигналов — имеет смысл коротко свериться с ощущениями на льду.`,
        tone: "neutral",
        priority: "medium",
        basedOn: {
          signalCount: heavy.totalSignals,
          domains: heavy.topDomains.map((d) => d.metricDomain),
          lastSessionAt: heavy.startedAt,
        },
      },
      seen
    );
  }

  if (
    trendSummary.insufficientForPatterns &&
    summary.totalSignals >= 1 &&
    summary.totalSignals <= 3 &&
    out.length === 0
  ) {
    pushUnique(
      out,
      {
        id: `ltac:p:${playerId}:follow_up_check:weak`,
        playerId,
        playerName,
        source: "live_training",
        actionType: "follow_up_check",
        title: "Проверить на следующей тренировке",
        body: "Пока мало подтверждённых сигналов в окне — один мягкий повод свериться на следующей тренировке.",
        tone: "neutral",
        priority: "low",
        basedOn: {
          signalCount: summary.totalSignals,
          domains: [],
          lastSessionAt: lastAt,
        },
      },
      seen
    );
  }

  return sortLiveTrainingActionCandidates(out, 5);
}

export async function getCoachPlayerLiveTrainingActionCandidates(
  playerId: string
): Promise<LiveTrainingActionCandidatesResponse> {
  const [player, bundle] = await Promise.all([
    prisma.player.findUnique({
      where: { id: playerId },
      select: { firstName: true, lastName: true },
    }),
    getPlayerLiveTrainingSignalsBundle(playerId),
  ]);
  const playerName = player
    ? [player.firstName, player.lastName].filter(Boolean).join(" ").trim() || "Игрок"
    : "Игрок";

  const items = buildCoachPlayerLiveTrainingActionCandidates(playerId, playerName, bundle);
  const lowData = bundle.summary.totalSignals === 0 || items.length === 0;
  return { items, lowData };
}
