/**
 * Read-model: итог подтверждённой live training session (PHASE 10).
 * Считает агрегаты по активным черновикам и по LiveTrainingPlayerSignal (исключённые черновики не дают сигналов).
 */

import { prisma } from "@/lib/prisma";

export type LiveTrainingSessionOutcomePlayerDto = {
  playerId: string;
  playerName: string;
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  /** До 2 доменов метрик с наибольшим числом сигналов у игрока в этой сессии. */
  topDomains: string[];
};

export type LiveTrainingSessionOutcomeDto = {
  /** Активные черновики (deletedAt null). */
  includedDraftsCount: number;
  excludedDraftsCount: number;
  /** Среди включённых черновиков с флагом needsReview (на момент чтения). */
  draftsFlaggedNeedsReview: number;
  /** Уникальные черновики: needsReview ИЛИ player-цель без playerId (без двойного счёта). */
  manualAttentionDraftsCount: number;
  /** Разбивка активных черновиков по цели (категория arena:* / игрок). */
  playerObservationCount: number;
  /** Среди player-цели: черновик с заполненным playerId (честная привязка к карточке). */
  playerLinkedObservationCount: number;
  /** Среди player-цели: без playerId — не перешло в сигнал без ручной привязки. */
  playerObservationUnlinkedCount: number;
  teamObservationCount: number;
  sessionObservationCount: number;
  signalsCreatedCount: number;
  affectedPlayersCount: number;
  positiveSignalsCount: number;
  negativeSignalsCount: number;
  neutralSignalsCount: number;
  /** До 3 доменов по числу сигналов в сессии. */
  topDomains: string[];
  /** До 5 игроков по убыванию числа сигналов. */
  topPlayers: LiveTrainingSessionOutcomePlayerDto[];
};

type PlayerAgg = {
  pos: number;
  neg: number;
  neu: number;
  domains: Map<string, number>;
};

function observationDraftTargetBucket(d: {
  category: string;
  playerId: string | null;
}): "player" | "team" | "session" {
  const c = (d.category ?? "").toLowerCase();
  if (c.startsWith("arena:team")) return "team";
  if (c.startsWith("arena:session")) return "session";
  return "player";
}

/**
 * Полная выгрузка outcome для сессии (без проверки статуса).
 * Вызывать только для подтверждённой сессии или сразу после confirm.
 */
export async function buildLiveTrainingSessionOutcomeForSession(
  sessionId: string
): Promise<LiveTrainingSessionOutcomeDto> {
  const [activeDrafts, excludedDraftsCount, signals] = await Promise.all([
    prisma.liveTrainingObservationDraft.findMany({
      where: { sessionId, deletedAt: null },
      select: { category: true, playerId: true, needsReview: true },
    }),
    prisma.liveTrainingObservationDraft.count({
      where: { sessionId, deletedAt: { not: null } },
    }),
    prisma.liveTrainingPlayerSignal.findMany({
      where: { liveTrainingSessionId: sessionId },
      select: { playerId: true, signalDirection: true, metricDomain: true },
    }),
  ]);

  const includedDraftsCount = activeDrafts.length;
  const draftsFlaggedNeedsReview = activeDrafts.filter((d) => d.needsReview).length;
  const manualAttentionDraftsCount = activeDrafts.filter(
    (d) => d.needsReview || (observationDraftTargetBucket(d) === "player" && !d.playerId)
  ).length;

  let playerObservationCount = 0;
  let playerLinkedObservationCount = 0;
  let playerObservationUnlinkedCount = 0;
  let teamObservationCount = 0;
  let sessionObservationCount = 0;
  for (const d of activeDrafts) {
    const b = observationDraftTargetBucket(d);
    if (b === "team") teamObservationCount += 1;
    else if (b === "session") sessionObservationCount += 1;
    else {
      playerObservationCount += 1;
      if (d.playerId) playerLinkedObservationCount += 1;
      else playerObservationUnlinkedCount += 1;
    }
  }

  let positiveSignalsCount = 0;
  let negativeSignalsCount = 0;
  let neutralSignalsCount = 0;
  const sessionDomainFreq = new Map<string, number>();
  const byPlayer = new Map<string, PlayerAgg>();

  for (const s of signals) {
    if (s.signalDirection === "positive") {
      positiveSignalsCount += 1;
    } else if (s.signalDirection === "negative") {
      negativeSignalsCount += 1;
    } else {
      neutralSignalsCount += 1;
    }

    sessionDomainFreq.set(s.metricDomain, (sessionDomainFreq.get(s.metricDomain) ?? 0) + 1);

    let agg = byPlayer.get(s.playerId);
    if (!agg) {
      agg = { pos: 0, neg: 0, neu: 0, domains: new Map() };
      byPlayer.set(s.playerId, agg);
    }
    if (s.signalDirection === "positive") {
      agg.pos += 1;
    } else if (s.signalDirection === "negative") {
      agg.neg += 1;
    } else {
      agg.neu += 1;
    }
    agg.domains.set(s.metricDomain, (agg.domains.get(s.metricDomain) ?? 0) + 1);
  }

  const topDomains = [...sessionDomainFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);

  const sortedPlayers = [...byPlayer.entries()].sort((a, b) => {
    const totalA = a[1].pos + a[1].neg + a[1].neu;
    const totalB = b[1].pos + b[1].neg + b[1].neu;
    return totalB - totalA;
  });
  const topEntries = sortedPlayers.slice(0, 5);
  const topIds = topEntries.map(([id]) => id);

  const players =
    topIds.length > 0
      ? await prisma.player.findMany({
          where: { id: { in: topIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
  const nameById = new Map(
    players.map((p) => [
      p.id,
      [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Игрок",
    ])
  );

  const topPlayers: LiveTrainingSessionOutcomePlayerDto[] = topEntries.map(([playerId, agg]) => {
    const totalSignals = agg.pos + agg.neg + agg.neu;
    const topDomainsForPlayer = [...agg.domains.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([d]) => d);
    return {
      playerId,
      playerName: nameById.get(playerId) ?? "Игрок",
      totalSignals,
      positiveCount: agg.pos,
      negativeCount: agg.neg,
      neutralCount: agg.neu,
      topDomains: topDomainsForPlayer,
    };
  });

  const affectedPlayersCount = byPlayer.size;

  return {
    includedDraftsCount,
    excludedDraftsCount,
    draftsFlaggedNeedsReview,
    manualAttentionDraftsCount,
    playerObservationCount,
    playerLinkedObservationCount,
    playerObservationUnlinkedCount,
    teamObservationCount,
    sessionObservationCount,
    signalsCreatedCount: signals.length,
    affectedPlayersCount,
    positiveSignalsCount,
    negativeSignalsCount,
    neutralSignalsCount,
    topDomains,
    topPlayers,
  };
}

/** Безопасно для неподтверждённых сессий: null, если не confirmed. */
export async function getLiveTrainingSessionOutcome(
  sessionId: string
): Promise<LiveTrainingSessionOutcomeDto | null> {
  const session = await prisma.liveTrainingSession.findUnique({
    where: { id: sessionId },
    select: { status: true },
  });
  if (!session || session.status !== "confirmed") {
    return null;
  }
  return buildLiveTrainingSessionOutcomeForSession(sessionId);
}
