/**
 * Read-only **Arena adoption snapshot** from OLTP facts (no client telemetry, no ROI score).
 *
 * **Time rules (explicit):**
 * - **Live-session funnel** (`liveSessionCount`, `confirmed*`, signal-derived optional fields): sessions whose
 *   **`startedAt`** lies in `[startDate, endDate]` (inclusive window on instants as passed).
 * - **`publishedReportCount`**: `LiveTrainingSessionReportDraft.publishedAt` in the same window (not tied to
 *   session `startedAt`) — “reports published in period”.
 * - **`nextFocusAppliedCount`**: `LiveTrainingSession.arenaNextFocusAppliedAt` in the window (adoption event),
 *   scoped by `teamId` / `coachId` on the session row.
 * - **`materializedActionCount`**: `ActionItem` with non-null `liveTrainingCandidateId` and `createdAt` in window.
 * - **`plannedVsObservedFactCount`**: `ArenaPlannedVsObservedLiveFact.createdAt` in window, scoped by team / session coach.
 *
 * **Not** ROI, retention, or user view/open tracking. **Not** proof that materialized actions were completed.
 * **Excludes** `Notification` and coach-app telemetry by design.
 *
 * @module arena-adoption-snapshot
 */

import { LiveTrainingSessionStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type GetArenaAdoptionSnapshotParams = {
  teamId?: string;
  coachId?: string;
  startDate: Date;
  endDate: Date;
};

export type ArenaAdoptionSnapshotScopeDto = {
  teamId?: string;
  coachId?: string;
  startDate: string;
  endDate: string;
};

export type ArenaAdoptionSnapshotDto = {
  scope: ArenaAdoptionSnapshotScopeDto;
  /** Sessions with `startedAt` in window (any status except filtered implicitly — all statuses). */
  liveSessionCount: number;
  /** Subset of cohort with `status === confirmed`. */
  confirmedLiveSessionCount: number;
  /** Confirmed cohort sessions with ≥1 `LiveTrainingPlayerSignal`. */
  confirmedWithSignalsCount: number;
  /** Report drafts with `publishedAt` set in window (same team/coach filters on draft). */
  publishedReportCount: number;
  /** Sessions where `arenaNextFocusAppliedAt` falls in window. */
  nextFocusAppliedCount: number;
  /** Action items materialized from live-training candidates (`liveTrainingCandidateId` not null). */
  materializedActionCount: number;
  /** PvO fact rows created in window. */
  plannedVsObservedFactCount: number;
  /** Sum of signal rows for confirmed sessions in cohort / `confirmedLiveSessionCount`; omitted when denominator 0. */
  avgSignalsPerConfirmedSession?: number;
  /** Distinct `playerId` on signals tied to confirmed sessions in the cohort. */
  uniquePlayersWithSignalsCount?: number;
};

function trimOrUndef(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t && t.length > 0 ? t : undefined;
}

function sessionCohortWhere(
  teamId: string | undefined,
  coachId: string | undefined,
  start: Date,
  end: Date
): Prisma.LiveTrainingSessionWhereInput {
  return {
    startedAt: { gte: start, lte: end },
    ...(teamId ? { teamId } : {}),
    ...(coachId ? { coachId } : {}),
  };
}

async function loadPlayerIdsForTeam(teamId: string): Promise<string[]> {
  const rows = await prisma.player.findMany({
    where: { teamId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** `ActionItem` has no Prisma relation to `Player` — filter via `playerId` list. */
async function countMaterializedLiveTrainingActions(params: {
  teamId: string | undefined;
  coachId: string | undefined;
  start: Date;
  end: Date;
}): Promise<number> {
  const { teamId, coachId, start, end } = params;
  const time = { gte: start, lte: end };
  const base: Prisma.ActionItemWhereInput = {
    liveTrainingCandidateId: { not: null },
    createdAt: time,
  };

  if (coachId && !teamId) {
    return prisma.actionItem.count({ where: { ...base, coachId } });
  }

  if (teamId && !coachId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { coachId: true },
    });
    const primaryCoachId = team?.coachId?.trim() || null;
    const playerIds = await loadPlayerIdsForTeam(teamId);
    const or: Prisma.ActionItemWhereInput[] = [];
    if (playerIds.length > 0) {
      or.push({ playerId: { in: playerIds } });
    }
    if (primaryCoachId) {
      or.push({ playerId: null, coachId: primaryCoachId });
    }
    if (or.length === 0) return 0;
    return prisma.actionItem.count({
      where: {
        ...base,
        OR: or,
      },
    });
  }

  if (teamId && coachId) {
    const playerIds = await loadPlayerIdsForTeam(teamId);
    const or: Prisma.ActionItemWhereInput[] = [{ playerId: null, coachId }];
    if (playerIds.length > 0) {
      or.unshift({ playerId: { in: playerIds }, coachId });
    }
    return prisma.actionItem.count({
      where: {
        ...base,
        OR: or,
      },
    });
  }

  return 0;
}

/**
 * Aggregates persisted adoption proxies. Throws if neither `teamId` nor `coachId` is provided, or if `startDate > endDate`.
 */
export async function getArenaAdoptionSnapshot(
  params: GetArenaAdoptionSnapshotParams
): Promise<ArenaAdoptionSnapshotDto> {
  const teamId = trimOrUndef(params.teamId);
  const coachId = trimOrUndef(params.coachId);
  const start = params.startDate;
  const end = params.endDate;

  if (!teamId && !coachId) {
    throw new Error("getArenaAdoptionSnapshot: require at least one of teamId or coachId");
  }
  if (start.getTime() > end.getTime()) {
    throw new Error("getArenaAdoptionSnapshot: startDate must be <= endDate");
  }

  const cohort = sessionCohortWhere(teamId, coachId, start, end);

  const draftScope: Prisma.LiveTrainingSessionReportDraftWhereInput = {
    publishedAt: { not: null, gte: start, lte: end },
    ...(teamId ? { teamId } : {}),
    ...(coachId ? { coachId } : {}),
  };

  const nextFocusWhere: Prisma.LiveTrainingSessionWhereInput = {
    arenaNextFocusAppliedAt: { not: null, gte: start, lte: end },
    ...(teamId ? { teamId } : {}),
    ...(coachId ? { coachId } : {}),
  };

  const pvoWhere: Prisma.ArenaPlannedVsObservedLiveFactWhereInput = {
    createdAt: { gte: start, lte: end },
    ...(teamId ? { teamId } : {}),
    ...(coachId
      ? {
          liveTrainingSession: { coachId },
        }
      : {}),
  };

  const confirmedCohort: Prisma.LiveTrainingSessionWhereInput = {
    ...cohort,
    status: LiveTrainingSessionStatus.confirmed,
  };

  const [
    liveSessionCount,
    confirmedLiveSessionCount,
    confirmedWithSignalsCount,
    publishedReportCount,
    nextFocusAppliedCount,
    materializedActionCount,
    plannedVsObservedFactCount,
    totalSignalsOnConfirmedCohort,
    distinctPlayersRows,
  ] = await Promise.all([
    prisma.liveTrainingSession.count({ where: cohort }),
    prisma.liveTrainingSession.count({ where: confirmedCohort }),
    prisma.liveTrainingSession.count({
      where: {
        ...confirmedCohort,
        LiveTrainingPlayerSignal: { some: {} },
      },
    }),
    prisma.liveTrainingSessionReportDraft.count({ where: draftScope }),
    prisma.liveTrainingSession.count({ where: nextFocusWhere }),
    countMaterializedLiveTrainingActions({ teamId, coachId, start, end }),
    prisma.arenaPlannedVsObservedLiveFact.count({ where: pvoWhere }),
    prisma.liveTrainingPlayerSignal.count({
      where: {
        LiveTrainingSession: confirmedCohort,
      },
    }),
    prisma.liveTrainingPlayerSignal.findMany({
      where: {
        LiveTrainingSession: confirmedCohort,
      },
      distinct: ["playerId"],
      select: { playerId: true },
    }),
  ]);

  const uniquePlayersWithSignalsCount = distinctPlayersRows.length;

  let avgSignalsPerConfirmedSession: number | undefined;
  if (confirmedLiveSessionCount > 0) {
    avgSignalsPerConfirmedSession = totalSignalsOnConfirmedCohort / confirmedLiveSessionCount;
  }

  return {
    scope: {
      ...(teamId ? { teamId } : {}),
      ...(coachId ? { coachId } : {}),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    liveSessionCount,
    confirmedLiveSessionCount,
    confirmedWithSignalsCount,
    publishedReportCount,
    nextFocusAppliedCount,
    materializedActionCount,
    plannedVsObservedFactCount,
    ...(confirmedLiveSessionCount > 0
      ? {
          avgSignalsPerConfirmedSession,
          uniquePlayersWithSignalsCount,
        }
      : {}),
  };
}
