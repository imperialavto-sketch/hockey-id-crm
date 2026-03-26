/**
 * Shared parent schedule logic — used by /api/parent/mobile/schedule and /api/me/schedule.
 * Prefers TrainingSession scoped by weekly PlayerGroupAssignment; falls back to legacy Training.
 */

import { prisma } from "./prisma";
import { parseDateParamUTC, toWeekStartUTC } from "./schedule-week";

/** Подпись вида тренировки для родителя (лёд / ОФП + опционально subType). */
function sessionKindLabel(type: string, subType: string | null): string {
  const t = type.toLowerCase();
  const base =
    t === "ofp"
      ? "ОФП"
      : t === "ice" || t === "hockey" || t === "game" || t === "individual"
        ? "Лёд"
        : type;
  const sub = subType?.trim();
  return sub ? `${base} · ${sub}` : base;
}

export interface ParentScheduleTraining {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location: string | null;
  teamId: string;
  /** Present when source is TrainingSession — ice | ofp */
  sessionType?: string;
  sessionSubType?: string | null;
  /** Посещаемость (TrainingAttendance), только для TrainingSession */
  attendanceStatus?: "present" | "absent" | null;
}

/**
 * Get trainings for parent's children's teams.
 * Auth must be validated by caller (PARENT role, parentId).
 */
export async function getParentScheduleTrainings(
  parentId: string
): Promise<ParentScheduleTraining[]> {
  const players = await prisma.player.findMany({
    where: {
      OR: [
        { parentId },
        { parentPlayers: { some: { parentId } } },
      ],
    },
    select: { teamId: true },
  });

  const teamIds = Array.from(new Set(players.map((p) => p.teamId).filter(Boolean))) as string[];
  if (teamIds.length === 0) {
    return [];
  }

  const trainings = await prisma.training.findMany({
    where: { teamId: { in: teamIds } },
    orderBy: { startTime: "asc" },
  });

  return trainings.map((t) => ({
    id: t.id,
    title: t.title,
    startTime: t.startTime,
    endTime: t.endTime,
    location: t.location,
    teamId: t.teamId,
  }));
}

async function parentOwnsPlayer(parentId: string, playerId: string): Promise<boolean> {
  const player = await prisma.player.findFirst({
    where: {
      id: playerId,
      OR: [{ parentId }, { parentPlayers: { some: { parentId } } }],
    },
    select: { id: true },
  });
  return !!player;
}

/**
 * Schedule for one child: sessions for assigned group this week only.
 * If no weekly assignment, falls back to legacy Training for that player's team.
 */
export async function getParentScheduleForPlayer(
  parentId: string,
  playerId: string,
  weekStartDateParam?: string
): Promise<ParentScheduleTraining[]> {
  if (!(await parentOwnsPlayer(parentId, playerId))) {
    return [];
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { teamId: true },
  });
  if (!player?.teamId) {
    return [];
  }

  const base = weekStartDateParam
    ? parseDateParamUTC(weekStartDateParam)
    : toWeekStartUTC(new Date());
  const weekStart = base ? toWeekStartUTC(base) : toWeekStartUTC(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const assignment = await prisma.playerGroupAssignment.findUnique({
    where: {
      playerId_weekStartDate: { playerId, weekStartDate: weekStart },
    },
    include: { group: { select: { name: true } } },
  });

  if (assignment) {
    const sessions = await prisma.trainingSession.findMany({
      where: {
        groupId: assignment.groupId,
        status: { not: "cancelled" },
        startAt: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { startAt: "asc" },
    });

    const attRows =
      sessions.length > 0
        ? await prisma.trainingAttendance.findMany({
            where: {
              playerId,
              trainingId: { in: sessions.map((s) => s.id) },
            },
          })
        : [];
    const attBySession = new Map(attRows.map((r) => [r.trainingId, r.status]));

    return sessions.map((s) => {
      const typeLabel = sessionKindLabel(s.type, s.subType ?? null);
      const groupSuffix = assignment.group?.name ? ` · ${assignment.group.name}` : "";
      const raw = attBySession.get(s.id);
      const attendanceStatus =
        raw === "present" || raw === "absent" ? raw : null;
      return {
        id: s.id,
        title: `${typeLabel}${groupSuffix}`,
        startTime: s.startAt,
        endTime: s.endAt,
        location: s.locationName ?? s.locationAddress ?? null,
        teamId: s.teamId,
        sessionType: s.type,
        sessionSubType: s.subType ?? null,
        attendanceStatus,
      };
    });
  }

  const trainings = await prisma.training.findMany({
    where: { teamId: player.teamId },
    orderBy: { startTime: "asc" },
  });

  return trainings.map((t) => ({
    id: t.id,
    title: t.title,
    startTime: t.startTime,
    endTime: t.endTime,
    location: t.location,
    teamId: t.teamId,
  }));
}
