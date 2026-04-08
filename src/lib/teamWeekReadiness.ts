import { prisma } from "@/lib/prisma";

export interface TeamWeekReadinessSnapshot {
  teamId: string;
  weekStartDate: string;
  hasSchedule: boolean;
  teamPlayersCount: number;
  assignedPlayersCount: number;
  missingAssignmentsCount: number;
  hasActiveGroups: boolean;
  parentVisibilityReady: boolean;
  warning: string | null;
}

export async function buildTeamWeekReadinessSnapshot(
  teamId: string,
  weekStart: Date
): Promise<TeamWeekReadinessSnapshot> {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const [teamPlayers, assignedCount, activeGroupsCount, sessionsCount] =
    await Promise.all([
      prisma.player.findMany({
        where: { teamId },
        select: { id: true },
      }),
      prisma.playerGroupAssignment.count({
        where: {
          player: { teamId },
          weekStartDate: weekStart,
        },
      }),
      prisma.teamGroup.count({
        where: { teamId, isActive: true },
      }),
      prisma.trainingSession.count({
        where: {
          teamId,
          status: { not: "cancelled" },
          startAt: { gte: weekStart, lt: weekEnd },
        },
      }),
    ]);

  const teamPlayersCount = teamPlayers.length;
  const missingAssignmentsCount = Math.max(0, teamPlayersCount - assignedCount);
  const hasSchedule = sessionsCount > 0;
  const parentVisibilityReady =
    !hasSchedule || teamPlayersCount === 0 || missingAssignmentsCount === 0;

  return {
    teamId,
    weekStartDate: weekStart.toISOString().slice(0, 10),
    hasSchedule,
    teamPlayersCount,
    assignedPlayersCount: assignedCount,
    missingAssignmentsCount,
    hasActiveGroups: activeGroupsCount > 0,
    parentVisibilityReady,
    warning:
      hasSchedule && !parentVisibilityReady
        ? "Расписание создано и видно тренерам. Родители увидят его полностью только после weekly-назначения игроков по группам."
        : null,
  };
}
