/**
 * Read-only aggregate: `ArenaCoreFacts` for one `LiveTrainingSession`.
 * Does not write, does not replace existing API routes — foundation for later unification.
 */

import { prisma } from "@/lib/prisma";
import { parsePersistedSessionMeaning } from "@/lib/live-training/session-meaning";
import { parsePlanningSnapshotFromDb } from "@/lib/live-training/live-training-planning-snapshot";
import { getCanonicalTrainingSessionIdFromLiveRow } from "@/lib/live-training/resolve-live-training-to-training-session";
import { getLiveTrainingSessionAnalyticsSummary } from "@/lib/live-training/live-training-player-signals";
import type {
  ArenaCoreCanonicalFacts,
  ArenaCoreDerivedFacts,
  ArenaCoreFacts,
  ArenaCoreFactsScope,
} from "./types";

const V1_NOTES = [
  "v1: external /api/arena/external-training/* not loaded",
  "v1: parent mixed read models (e.g. getParentLatestLiveTrainingSummaryForPlayer) not loaded",
  "v1: loadEnrichedLiveTrainingDraftsForSession not called — use counts + analyticsSummary only",
] as const;

function reportHasPublishedText(r: {
  summary: string | null;
  focusAreas: string | null;
  coachNote: string | null;
  parentMessage: string | null;
}): boolean {
  return Boolean(
    r.summary?.trim() ||
      r.focusAreas?.trim() ||
      r.coachNote?.trim() ||
      r.parentMessage?.trim()
  );
}

/**
 * Load Arena Supercore facts for a single live session. Returns null if session missing.
 */
export async function loadArenaCoreFacts(
  scope: ArenaCoreFactsScope
): Promise<ArenaCoreFacts | null> {
  const session = await prisma.liveTrainingSession.findUnique({
    where: { id: scope.liveTrainingSessionId },
    select: {
      id: true,
      coachId: true,
      teamId: true,
      mode: true,
      status: true,
      startedAt: true,
      endedAt: true,
      confirmedAt: true,
      trainingSessionId: true,
      planningSnapshotJson: true,
      sessionMeaningJson: true,
      arenaNextFocusLine: true,
      arenaNextFocusAppliedAt: true,
      arenaNextFocusTargetTrainingSessionId: true,
      Team: { select: { name: true } },
      LiveTrainingSessionReportDraft: {
        select: { id: true, status: true, publishedAt: true },
      },
    },
  });

  if (!session) return null;

  const [
    liveTrainingEvents,
    liveTrainingPlayerSignals,
    liveTrainingObservationDraftsActive,
    analyticsSummary,
  ] = await Promise.all([
    prisma.liveTrainingEvent.count({ where: { sessionId: session.id } }),
    prisma.liveTrainingPlayerSignal.count({
      where: { liveTrainingSessionId: session.id },
    }),
    prisma.liveTrainingObservationDraft.count({
      where: { sessionId: session.id, deletedAt: null },
    }),
    getLiveTrainingSessionAnalyticsSummary(session.id),
  ]);

  const linkedTrainingSessionId = getCanonicalTrainingSessionIdFromLiveRow({
    trainingSessionId: session.trainingSessionId,
    planningSnapshotJson: session.planningSnapshotJson,
  });

  let publishedTrainingSessionReport: ArenaCoreCanonicalFacts["publishedTrainingSessionReport"] =
    null;
  if (linkedTrainingSessionId) {
    const report = await prisma.trainingSessionReport.findUnique({
      where: { trainingId: linkedTrainingSessionId },
      select: {
        id: true,
        summary: true,
        focusAreas: true,
        coachNote: true,
        parentMessage: true,
      },
    });
    if (report) {
      publishedTrainingSessionReport = {
        trainingSessionId: linkedTrainingSessionId,
        reportId: report.id,
        hasPublishedText: reportHasPublishedText(report),
      };
    }
  }

  const draft = session.LiveTrainingSessionReportDraft;

  const canonical: ArenaCoreCanonicalFacts = {
    tier: "canonical",
    liveTrainingSessionId: session.id,
    coachId: session.coachId,
    teamId: session.teamId,
    teamName: session.Team?.name ?? null,
    mode: session.mode,
    status: session.status,
    trainingSessionIdColumn: session.trainingSessionId,
    linkedTrainingSessionId,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    confirmedAt: session.confirmedAt?.toISOString() ?? null,
    arenaNextFocusLine: session.arenaNextFocusLine,
    arenaNextFocusAppliedAt: session.arenaNextFocusAppliedAt?.toISOString() ?? null,
    arenaNextFocusTargetTrainingSessionId:
      session.arenaNextFocusTargetTrainingSessionId,
    counts: {
      liveTrainingEvents,
      liveTrainingPlayerSignals,
      liveTrainingObservationDraftsActive,
    },
    reportDraft: draft
      ? {
          id: draft.id,
          status: String(draft.status),
          publishedAt: draft.publishedAt?.toISOString() ?? null,
        }
      : null,
    publishedTrainingSessionReport,
  };

  const derived: ArenaCoreDerivedFacts = {
    tier: "derived",
    sessionMeaning: parsePersistedSessionMeaning(session.sessionMeaningJson),
    planningSnapshot: parsePlanningSnapshotFromDb(session.planningSnapshotJson),
    analyticsSummary,
  };

  return {
    meta: {
      version: "1",
      notes: [...V1_NOTES],
      excluded: {
        externalTrainingContour: true,
        parentMixedReadModels: true,
        loadEnrichedLiveTrainingDraftsForSession: true,
      },
    },
    canonical,
    derived,
  };
}
