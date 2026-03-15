/**
 * Parent access checks — can parent access this player?
 * Supports both legacy parentId and ParentPlayer link (invited parents).
 */

import { prisma } from "./prisma";

export async function canParentAccessPlayer(
  parentId: string,
  playerId: string
): Promise<boolean> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      parentId: true,
      parentPlayers: {
        where: { parentId },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!player) return false;
  if (player.parentId === parentId) return true;
  return player.parentPlayers.length > 0;
}
