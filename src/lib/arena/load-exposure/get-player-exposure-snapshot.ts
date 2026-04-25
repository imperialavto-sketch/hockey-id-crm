/**
 * Read-only **player exposure proxy** over a wall-clock window: separates **team schedule**, **player attendance**,
 * **external training reports**, and optional **team-level live session** volume.
 *
 * **Semantic boundaries**
 * - **Not** physiological load, **not** ice-time truth, **not** a replacement for `evaluatePlayerLoad` (unchanged elsewhere).
 * - `teamScheduledSessionCount` / minutes are **team calendar** facts — **not** the same as this player’s attended exposure.
 * - External report counts are **event counts**, not minutes or intensity.
 * - `teamLiveSessionCount` is explicitly a **team proxy** (all `LiveTrainingSession` rows for the team in the window),
 *   not proof the player participated in live capture.
 * - **No** `isHighLoad`, **no** unified score, **no** ranking.
 *
 * **Window:** `TrainingSession.startAt` / `LiveTrainingSession.startedAt` must fall in `[startDate, endDate]` (inclusive).
 *
 * @see `arena-load-exposure-proxies-inventory.ts`
 */

import { prisma } from "@/lib/prisma";
import { isAttendancePresentForScoring } from "@/lib/attendance-status-scoring";

export type GetPlayerExposureSnapshotParams = {
  playerId: string;
  startDate: Date;
  endDate: Date;
};

export type PlayerExposureSnapshotDto = {
  playerId: string;
  teamId: string | null;
  startDate: string;
  endDate: string;
  /** Team `TrainingSession` rows (not cancelled) with `startAt` in window; 0 if player has no `teamId`. */
  teamScheduledSessionCount: number;
  /** `TrainingAttendance` rows for this player on those sessions where status counts as present for scoring (`PRESENT` / `present`). */
  attendedScheduledSessionCount: number;
  /** Explicit `ABSENT` / `absent` attendance rows in window (does not include LATE / EXCUSED). */
  absentScheduledSessionCount: number;
  /** Attendance rows in window with status other than present-for-scoring or strict absent (e.g. LATE, EXCUSED, empty). */
  unknownAttendanceSessionCount: number;
  /** `ExternalTrainingReport` rows for this player with `createdAt` in window. */
  externalTrainingReportCount: number;
  /** ISO timestamp of latest external report for player (any time); null if none. */
  latestExternalTrainingAt: string | null;
  /** Sum of (endAt - startAt) in minutes for team scheduled sessions in window; omitted if no sessions. */
  teamScheduledMinutes?: number;
  /** Sum of scheduled minutes for sessions where this player is scored as present in window. */
  attendedScheduledMinutes?: number;
  /**
   * Team-level count of `LiveTrainingSession` with `startedAt` in window for the player’s current `teamId`.
   * **Not** player participation in live capture.
   */
  teamLiveSessionCount?: number;
  /**
   * Team scheduled sessions in the window with **no** `TrainingAttendance` row for this player (data gap vs absent).
   * Only computed when `teamId` is set (same team scope as schedule).
   */
  scheduledSessionsWithoutAttendanceRecordCount?: number;
};

function trainingInWindowWhere(
  teamId: string | undefined,
  start: Date,
  end: Date
): { teamId?: string; startAt: { gte: Date; lte: Date }; status: { not: string } } {
  return {
    ...(teamId ? { teamId } : {}),
    startAt: { gte: start, lte: end },
    status: { not: "cancelled" },
  };
}

function scheduledMinutesFromSessions(
  rows: Array<{ startAt: Date; endAt: Date }>
): number {
  let ms = 0;
  for (const r of rows) {
    ms += Math.max(0, r.endAt.getTime() - r.startAt.getTime());
  }
  return Math.round(ms / 60_000);
}

function isStrictAbsentStatus(status: string | null | undefined): boolean {
  return String(status ?? "")
    .trim()
    .toUpperCase() === "ABSENT";
}

/**
 * @throws Error when `startDate > endDate`, blank `playerId`, or player row not found.
 */
export async function getPlayerExposureSnapshot(
  params: GetPlayerExposureSnapshotParams
): Promise<PlayerExposureSnapshotDto> {
  const playerId = params.playerId.trim();
  const start = params.startDate;
  const end = params.endDate;

  if (!playerId) {
    throw new Error("getPlayerExposureSnapshot: playerId is required");
  }
  if (start.getTime() > end.getTime()) {
    throw new Error("getPlayerExposureSnapshot: startDate must be <= endDate");
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { teamId: true },
  });
  if (!player) {
    throw new Error("getPlayerExposureSnapshot: player not found");
  }

  const teamId = player.teamId?.trim() || null;
  const sessionWhere = trainingInWindowWhere(teamId ?? undefined, start, end);

  const [
    teamSessions,
    attendanceRows,
    externalReportCount,
    latestExternal,
    teamLiveSessionCount,
  ] = await Promise.all([
    teamId
      ? prisma.trainingSession.findMany({
          where: sessionWhere,
          select: { id: true, startAt: true, endAt: true },
        })
      : Promise.resolve([] as Array<{ id: string; startAt: Date; endAt: Date }>),
    prisma.trainingAttendance.findMany({
      where: {
        playerId,
        training: trainingInWindowWhere(teamId ?? undefined, start, end),
      },
      select: {
        status: true,
        trainingId: true,
        training: { select: { startAt: true, endAt: true } },
      },
    }),
    prisma.externalTrainingReport.count({
      where: {
        playerId,
        createdAt: { gte: start, lte: end },
      },
    }),
    prisma.externalTrainingReport.findFirst({
      where: { playerId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    teamId
      ? prisma.liveTrainingSession.count({
          where: {
            teamId,
            startedAt: { gte: start, lte: end },
          },
        })
      : Promise.resolve(0),
  ]);

  const teamScheduledSessionCount = teamSessions.length;
  const teamScheduledMinutes =
    teamSessions.length > 0 ? scheduledMinutesFromSessions(teamSessions) : undefined;

  let attendedScheduledSessionCount = 0;
  let absentScheduledSessionCount = 0;
  let unknownAttendanceSessionCount = 0;
  let attendedMs = 0;

  for (const row of attendanceRows) {
    const st = row.status;
    if (isAttendancePresentForScoring(st)) {
      attendedScheduledSessionCount += 1;
      attendedMs += Math.max(
        0,
        row.training.endAt.getTime() - row.training.startAt.getTime()
      );
    } else if (isStrictAbsentStatus(st)) {
      absentScheduledSessionCount += 1;
    } else {
      unknownAttendanceSessionCount += 1;
    }
  }

  const attendedScheduledMinutes =
    attendedScheduledSessionCount > 0 ? Math.round(attendedMs / 60_000) : undefined;

  let scheduledSessionsWithoutAttendanceRecordCount: number | undefined;
  if (teamId && teamSessions.length > 0) {
    const attendedTrainingIds = new Set(attendanceRows.map((r) => r.trainingId));
    scheduledSessionsWithoutAttendanceRecordCount = teamSessions.filter(
      (s) => !attendedTrainingIds.has(s.id)
    ).length;
  }

  return {
    playerId,
    teamId,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    teamScheduledSessionCount,
    attendedScheduledSessionCount,
    absentScheduledSessionCount,
    unknownAttendanceSessionCount,
    externalTrainingReportCount: externalReportCount,
    latestExternalTrainingAt: latestExternal?.createdAt.toISOString() ?? null,
    ...(teamScheduledMinutes !== undefined ? { teamScheduledMinutes } : {}),
    ...(attendedScheduledMinutes !== undefined ? { attendedScheduledMinutes } : {}),
    ...(teamId ? { teamLiveSessionCount } : {}),
    ...(scheduledSessionsWithoutAttendanceRecordCount !== undefined
      ? { scheduledSessionsWithoutAttendanceRecordCount }
      : {}),
  };
}
