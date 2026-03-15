/**
 * Get team IDs for teams that the parent has access to (via linked players).
 */

import { prisma } from "../prisma";

export async function getParentTeamIds(parentId: string): Promise<string[]> {
  const players = await prisma.player.findMany({
    where: {
      OR: [
        { parentId },
        { parentPlayers: { some: { parentId } } },
      ],
    },
    select: { teamId: true },
  });

  const teamIds = new Set<string>();
  for (const p of players) {
    if (p.teamId) teamIds.add(p.teamId);
  }
  return Array.from(teamIds);
}
