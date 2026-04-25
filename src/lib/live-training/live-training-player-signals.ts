/**
 * Persistence + read helpers для LiveTrainingPlayerSignal.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canonicalGroupIdForLiveSession } from "@/lib/live-training/canonical-group-of-live-session";
import { getCanonicalTrainingSessionIdFromLiveRow } from "@/lib/live-training/resolve-live-training-to-training-session";
import {
  mapLiveTrainingDraftToAnalyticsSignals,
  type LiveTrainingDraftForAnalyticsMap,
} from "./map-live-training-draft-to-analytics-signals";

/** Written on signal materialize (confirm) only; see createLiveTrainingPlayerSignalsInTransaction. */
const ARENA_GROUP_ATTRIBUTION_VERSION = "session_canonical_v1" as const;

export type LiveTrainingSessionAnalyticsSummary = {
  signalCount: number;
  playersWithSignals: number;
  draftsWithPlayerCount: number;
};

export async function getLiveTrainingSessionAnalyticsSummary(
  sessionId: string
): Promise<LiveTrainingSessionAnalyticsSummary> {
  const [signalCount, draftsWithPlayerCount, distinctPlayers] = await Promise.all([
    prisma.liveTrainingPlayerSignal.count({ where: { liveTrainingSessionId: sessionId } }),
    prisma.liveTrainingObservationDraft.count({
      where: { sessionId, playerId: { not: null }, deletedAt: null },
    }),
    prisma.liveTrainingPlayerSignal.findMany({
      where: { liveTrainingSessionId: sessionId },
      select: { playerId: true },
      distinct: ["playerId"],
    }),
  ]);

  return {
    signalCount,
    draftsWithPlayerCount,
    playersWithSignals: distinctPlayers.length,
  };
}

export type LiveTrainingPlayerSignalRow = {
  id: string;
  playerId: string;
  liveTrainingSessionId: string;
  liveTrainingObservationDraftId: string;
  sourceType: string;
  metricDomain: string;
  metricKey: string;
  signalDirection: string;
  signalStrength: number;
  evidenceText: string;
  createdAt: Date;
};

export async function listLiveTrainingPlayerSignalsForPlayer(
  playerId: string,
  options?: { limit?: number }
): Promise<LiveTrainingPlayerSignalRow[]> {
  const take = Math.min(Math.max(options?.limit ?? 100, 1), 500);
  const rows = await prisma.liveTrainingPlayerSignal.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      playerId: true,
      liveTrainingSessionId: true,
      liveTrainingObservationDraftId: true,
      sourceType: true,
      metricDomain: true,
      metricKey: true,
      signalDirection: true,
      signalStrength: true,
      evidenceText: true,
      createdAt: true,
    },
  });
  return rows;
}

export type CreateSignalsResult = {
  createdSignalsCount: number;
  affectedPlayersCount: number;
};

/**
 * Создаёт сигналы для черновиков с playerId; идемпотентно по уникальному draftId.
 */
export async function createLiveTrainingPlayerSignalsInTransaction(
  tx: Prisma.TransactionClient,
  params: {
    sessionId: string;
    coachId: string;
    teamId: string;
  }
): Promise<CreateSignalsResult> {
  const liveRow = await tx.liveTrainingSession.findFirst({
    where: { id: params.sessionId, teamId: params.teamId },
    select: { planningSnapshotJson: true, trainingSessionId: true },
  });

  let linkedTrainingSessionGroupId: string | null | undefined;
  if (liveRow) {
    const slotId = getCanonicalTrainingSessionIdFromLiveRow({
      trainingSessionId: liveRow.trainingSessionId,
      planningSnapshotJson: liveRow.planningSnapshotJson,
    });
    if (slotId) {
      const slot = await tx.trainingSession.findFirst({
        where: { id: slotId, teamId: params.teamId },
        select: { groupId: true },
      });
      linkedTrainingSessionGroupId = slot?.groupId?.trim() || null;
    }
  }

  /**
   * Session-context attribution only (not per-player / not «true observed subgroup»).
   * `arenaSessionGroupId: null` means canonical resolver says no team group for this session — still
   * explicit for read models; mixed rosters are not resolved here.
   */
  const sessionGroupAttributionMetadata: Prisma.InputJsonValue = {
    arenaSessionGroupId: liveRow
      ? canonicalGroupIdForLiveSession({
          planningSnapshotJson: liveRow.planningSnapshotJson,
          linkedTrainingSessionGroupId,
        })
      : null,
    arenaGroupAttributionVersion: ARENA_GROUP_ATTRIBUTION_VERSION,
  };

  const drafts = await tx.liveTrainingObservationDraft.findMany({
    where: {
      sessionId: params.sessionId,
      playerId: { not: null },
      deletedAt: null,
    },
  });

  let createdSignalsCount = 0;
  const affected = new Set<string>();

  for (const d of drafts) {
    if (!d.playerId) continue;

    const existing = await tx.liveTrainingPlayerSignal.findUnique({
      where: { liveTrainingObservationDraftId: d.id },
    });
    if (existing) continue;

    const draftLike: LiveTrainingDraftForAnalyticsMap = {
      id: d.id,
      playerId: d.playerId,
      sourceText: d.sourceText,
      category: d.category,
      sentiment: d.sentiment,
    };

    const slices = mapLiveTrainingDraftToAnalyticsSignals(draftLike);
    for (const slice of slices) {
      try {
        await tx.liveTrainingPlayerSignal.create({
          data: {
            playerId: d.playerId,
            teamId: params.teamId,
            coachId: params.coachId,
            liveTrainingSessionId: params.sessionId,
            liveTrainingObservationDraftId: d.id,
            liveTrainingEventId: null,
            sourceType: "live_training",
            metricDomain: slice.metricDomain,
            metricKey: slice.metricKey,
            signalDirection: slice.signalDirection,
            signalStrength: slice.signalStrength,
            evidenceText: slice.evidenceText,
            metadataJson: sessionGroupAttributionMetadata,
          },
        });
        createdSignalsCount += 1;
        affected.add(d.playerId);
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          continue;
        }
        throw e;
      }
    }
  }

  return {
    createdSignalsCount,
    affectedPlayersCount: affected.size,
  };
}
