/**
 * Общая логика посещаемости для TrainingSession (неделя + группа).
 */

import { prisma } from "./prisma";
import { toWeekStartUTC } from "./schedule-week";

export function sessionWeekStartFromSessionStart(sessionStartAt: Date): Date {
  return toWeekStartUTC(new Date(sessionStartAt));
}

export type SessionGroupPlayer = {
  playerId: string;
  firstName: string;
  lastName: string;
};

/**
 * Игроки группы на неделю сессии (по PlayerGroupAssignment), без дубликатов.
 */
export async function getPlayersForSessionGroupWeek(
  groupId: string,
  weekStart: Date
): Promise<SessionGroupPlayer[]> {
  const assignments = await prisma.playerGroupAssignment.findMany({
    where: {
      groupId,
      weekStartDate: weekStart,
    },
    include: {
      player: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  const seen = new Map<string, SessionGroupPlayer>();
  for (const a of assignments) {
    if (!seen.has(a.playerId)) {
      seen.set(a.playerId, {
        playerId: a.player.id,
        firstName: a.player.firstName,
        lastName: a.player.lastName,
      });
    }
  }

  return Array.from(seen.values()).sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(
      `${b.lastName} ${b.firstName}`,
      "ru"
    )
  );
}
