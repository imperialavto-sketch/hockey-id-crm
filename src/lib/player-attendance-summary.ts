/**
 * Сводка посещаемости по TrainingSession + PlayerGroupAssignment + TrainingAttendance.
 * Legacy Training / Attendance не используются.
 */

import { prisma } from "./prisma";
import { parseDateParamUTC } from "./schedule-week";
import { sessionWeekStartFromSessionStart } from "./training-session-attendance";

export type AttendanceSummaryNumbers = {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  /** 0–100, округление до целого */
  attendanceRate: number;
};

function pairKey(groupId: string, weekStart: Date): string {
  return `${groupId}\0${weekStart.getTime()}`;
}

export function parseAttendanceSummaryRange(
  fromDate: string | null,
  toDate: string | null
):
  | { rangeStart: Date; rangeEndExclusive: Date }
  | { error: string } {
  if (!fromDate?.trim() || !toDate?.trim()) {
    return { error: "Укажите fromDate и toDate (YYYY-MM-DD)" };
  }
  const from = parseDateParamUTC(fromDate.trim());
  const toDay = parseDateParamUTC(toDate.trim());
  if (!from || !toDay) {
    return { error: "Недопустимый формат даты" };
  }
  const rangeEndExclusive = new Date(toDay);
  rangeEndExclusive.setUTCDate(rangeEndExclusive.getUTCDate() + 1);
  if (from.getTime() >= rangeEndExclusive.getTime()) {
    return { error: "fromDate не должен быть позже toDate" };
  }
  return { rangeStart: from, rangeEndExclusive };
}

export async function computePlayerAttendanceSummary(
  playerId: string,
  rangeStart: Date,
  rangeEndExclusive: Date
): Promise<AttendanceSummaryNumbers> {
  const sessions = await prisma.trainingSession.findMany({
    where: {
      startAt: { gte: rangeStart, lt: rangeEndExclusive },
      NOT: { status: "cancelled" },
    },
    select: { id: true, groupId: true, startAt: true },
  });

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      presentCount: 0,
      absentCount: 0,
      attendanceRate: 0,
    };
  }

  const pairSet = new Map<string, { groupId: string; weekStart: Date }>();
  for (const s of sessions) {
    const weekStart = sessionWeekStartFromSessionStart(s.startAt);
    const key = pairKey(s.groupId, weekStart);
    if (!pairSet.has(key)) {
      pairSet.set(key, { groupId: s.groupId, weekStart });
    }
  }

  const pairs = Array.from(pairSet.values());
  const assignments = await prisma.playerGroupAssignment.findMany({
    where: {
      playerId,
      OR: pairs.map((p) => ({
        groupId: p.groupId,
        weekStartDate: p.weekStart,
      })),
    },
    select: { groupId: true, weekStartDate: true },
  });

  const assignmentKeys = new Set(
    assignments.map((a) => pairKey(a.groupId, a.weekStartDate))
  );

  const eligibleIds: string[] = [];
  for (const s of sessions) {
    const weekStart = sessionWeekStartFromSessionStart(s.startAt);
    if (assignmentKeys.has(pairKey(s.groupId, weekStart))) {
      eligibleIds.push(s.id);
    }
  }

  if (eligibleIds.length === 0) {
    return {
      totalSessions: 0,
      presentCount: 0,
      absentCount: 0,
      attendanceRate: 0,
    };
  }

  const attendances = await prisma.trainingAttendance.findMany({
    where: {
      playerId,
      trainingId: { in: eligibleIds },
    },
    select: { status: true },
  });

  let presentCount = 0;
  let absentCount = 0;
  for (const row of attendances) {
    if (row.status === "present") presentCount += 1;
    else if (row.status === "absent") absentCount += 1;
  }

  const totalSessions = eligibleIds.length;
  const attendanceRate =
    totalSessions > 0
      ? Math.round((presentCount / totalSessions) * 100)
      : 0;

  return {
    totalSessions,
    presentCount,
    absentCount,
    attendanceRate,
  };
}
