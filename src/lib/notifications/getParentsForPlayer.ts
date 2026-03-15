/**
 * Get parent IDs linked to a player.
 */

import { prisma } from "../prisma";

export async function getParentIdsForPlayer(playerId: string): Promise<string[]> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      parentId: true,
      parentPlayers: { select: { parentId: true } },
    },
  });

  if (!player) return [];

  const ids = new Set<string>();
  if (player.parentId) ids.add(player.parentId);
  for (const pp of player.parentPlayers) {
    ids.add(pp.parentId);
  }
  return Array.from(ids);
}
