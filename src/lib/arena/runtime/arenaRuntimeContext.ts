import { prisma } from "@/lib/prisma";
import { parsePlanningSnapshotFromDb } from "@/lib/live-training/live-training-planning-snapshot";

export type ArenaRuntimePlayer = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
};

export type ArenaRuntimeContext = {
  sessionId: string;
  teamId: string;
  groupId: string | null;
  players: ArenaRuntimePlayer[];
};

/**
 * Контекст Arena для живой тренировки: команда, опциональная группа, ростер для матчинга.
 */
export async function buildArenaRuntimeContext(sessionId: string): Promise<ArenaRuntimeContext> {
  const row = await prisma.liveTrainingSession.findUnique({
    where: { id: sessionId },
    select: { id: true, teamId: true, planningSnapshotJson: true },
  });
  if (!row) {
    throw new Error(`LiveTrainingSession not found: ${sessionId}`);
  }

  const snap = parsePlanningSnapshotFromDb(row.planningSnapshotJson);
  const teamId = row.teamId;
  const groupId =
    snap?.groupId !== undefined
      ? snap.groupId
      : (snap?.scheduleSlotContext?.groupId ?? null);

  const players = await prisma.player.findMany({
    where: {
      teamId,
      ...(groupId ? { groupId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profile: { select: { jerseyNumber: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return {
    sessionId: row.id,
    teamId,
    groupId,
    players: players.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      jerseyNumber: p.profile?.jerseyNumber ?? null,
    })),
  };
}
