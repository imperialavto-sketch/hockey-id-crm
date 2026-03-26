/**
 * Parent access checks — can parent access this player / team?
 * Supports both legacy parentId and ParentPlayer link (invited parents).
 */

import { prisma } from "./prisma";

/** Can parent access this team? (parent has a child in the team) */
export async function canParentAccessTeam(
  parentId: string,
  teamId: string
): Promise<boolean> {
  const count = await prisma.player.count({
    where: {
      teamId,
      OR: [
        { parentId },
        { parentPlayers: { some: { parentId } } },
      ],
    },
  });
  return count > 0;
}

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
