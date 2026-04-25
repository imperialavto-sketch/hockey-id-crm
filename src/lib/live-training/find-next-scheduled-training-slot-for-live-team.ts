import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Канонический выбор «следующего» будущего слота `TrainingSession` для команды,
 * с учётом привязанного к live-сессии слота (исключение текущего) и предпочтения той же `groupId`.
 *
 * Используется coach-apply, CRM team snapshot (`GET /api/teams/[id]` → `nextScheduledTrainingSession`) и
 * будущий server-side auto-apply (без скрытых записей на read).
 */
export type NextScheduledTrainingSlotPick = { id: string; startAt: Date };

export async function findNextScheduledTrainingSlotForLiveTeam(input: {
  teamId: string;
  linkedTrainingSessionId: string | null;
}): Promise<NextScheduledTrainingSlotPick | null> {
  const now = new Date();
  const { teamId, linkedTrainingSessionId } = input;
  let preferGroupId: string | null = null;
  if (linkedTrainingSessionId) {
    const cur = await prisma.trainingSession.findUnique({
      where: { id: linkedTrainingSessionId },
      select: { groupId: true, teamId: true },
    });
    if (cur?.teamId === teamId) {
      preferGroupId = cur.groupId ?? null;
    }
  }
  const base: Prisma.TrainingSessionWhereInput = {
    teamId,
    status: "scheduled",
    startAt: { gt: now },
    ...(linkedTrainingSessionId ? { id: { not: linkedTrainingSessionId } } : {}),
  };
  if (preferGroupId) {
    const same = await prisma.trainingSession.findFirst({
      where: { ...base, groupId: preferGroupId },
      orderBy: { startAt: "asc" },
      select: { id: true, startAt: true },
    });
    if (same) return same;
  }
  return prisma.trainingSession.findFirst({
    where: base,
    orderBy: { startAt: "asc" },
    select: { id: true, startAt: true },
  });
}
