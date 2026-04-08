/**
 * Teams reachable by parent via linked children.
 * PHASE 2: SSOT = `ParentPlayer` only (not `Player.parentId`).
 */

import { prisma } from "@/lib/prisma";

export async function getParentActiveTeamIds(parentId: string): Promise<string[]> {
  const players = await prisma.player.findMany({
    where: {
      teamId: { not: null },
      parentPlayers: { some: { parentId } },
    },
    select: { teamId: true },
  });
  const set = new Set<string>();
  for (const p of players) {
    if (p.teamId) set.add(p.teamId);
  }
  return [...set];
}
