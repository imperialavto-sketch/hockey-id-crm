/**
 * Shared read-model for Hockey ID professional stats (game events, behaviors, skills).
 * Used by CRM route GET and parent mobile alias GET — same JSON shape.
 */

import { prisma } from "@/lib/prisma";

export type ProfessionalStatsPayload = {
  gameEventsByType: Record<string, number>;
  recentBehaviors: {
    type: string;
    intensity: string | null;
    note: string | null;
    createdAt: Date;
  }[];
  skillProgress: {
    skill: string;
    status: string;
    trend: string | null;
    note: string | null;
    measuredAt: Date;
  }[];
  latestIndex: Awaited<
    ReturnType<typeof prisma.playerIndex.findFirst>
  > | null;
  latestSnapshot: Awaited<
    ReturnType<typeof prisma.playerStatsSnapshot.findFirst>
  > | null;
};

export async function getProfessionalStatsPayload(
  playerId: string
): Promise<ProfessionalStatsPayload> {
  const [grouped, recentBehaviors, skillProgress, latestIndex, latestSnapshot] =
    await Promise.all([
      prisma.gameEvent.groupBy({
        by: ["type"],
        where: { playerId },
        _count: { _all: true },
      }),
      prisma.behaviorLog.findMany({
        where: { playerId },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          type: true,
          intensity: true,
          note: true,
          createdAt: true,
        },
      }),
      prisma.skillProgress.findMany({
        where: { playerId },
        orderBy: { measuredAt: "desc" },
        take: 15,
        select: {
          skill: true,
          status: true,
          trend: true,
          note: true,
          measuredAt: true,
        },
      }),
      prisma.playerIndex.findFirst({
        where: { playerId },
        orderBy: { calculatedAt: "desc" },
      }),
      prisma.playerStatsSnapshot.findFirst({
        where: { playerId },
        orderBy: { periodStart: "desc" },
      }),
    ]);

  const gameEventsByType: Record<string, number> = {};
  for (const row of grouped) {
    gameEventsByType[row.type] = row._count._all;
  }

  return {
    gameEventsByType,
    recentBehaviors,
    skillProgress,
    latestIndex,
    latestSnapshot,
  };
}
