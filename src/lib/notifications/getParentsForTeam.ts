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

/** Parent + player pairs for team-scoped notifications (deduped per parentId/playerId). */
export async function getParentPlayerAnchorsForTeam(
  teamId: string
): Promise<Array<{ parentId: string; playerId: string }>> {
  const players = await prisma.player.findMany({
    where: { teamId },
    select: {
      id: true,
      parentId: true,
      parentPlayers: { select: { parentId: true } },
    },
  });

  const out: Array<{ parentId: string; playerId: string }> = [];
  const seen = new Set<string>();
  for (const p of players) {
    const parentIds: string[] = [];
    if (p.parentId) parentIds.push(p.parentId);
    for (const pp of p.parentPlayers) parentIds.push(pp.parentId);
    for (const parentId of parentIds) {
      const key = `${parentId}:${p.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ parentId, playerId: p.id });
    }
  }
  return out;
}
