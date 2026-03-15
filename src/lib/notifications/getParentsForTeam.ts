/**
 * Get parent IDs linked to players in a team.
 */

import { prisma } from "../prisma";

export async function getParentIdsForTeam(teamId: string): Promise<string[]> {
  const players = await prisma.player.findMany({
    where: { teamId },
    select: {
      parentId: true,
      parentPlayers: { select: { parentId: true } },
    },
  });

  const ids = new Set<string>();
  for (const p of players) {
    if (p.parentId) ids.add(p.parentId);
    for (const pp of p.parentPlayers) {
      ids.add(pp.parentId);
    }
  }
  return Array.from(ids);
}
