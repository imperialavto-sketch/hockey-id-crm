/**
 * Блокировки родитель ↔ родитель в контексте команды (messenger).
 * Любая запись в паре (A блокирует B или наоборот) запрещает переписку parent_parent_direct.
 */

import { prisma } from "@/lib/prisma";

export async function parentPeerPairBlockedInTeam(
  teamId: string,
  parentA: string,
  parentB: string
): Promise<boolean> {
  if (!teamId || !parentA || !parentB || parentA === parentB) return false;
  const row = await prisma.parentPeerBlock.findFirst({
    where: {
      teamContextId: teamId,
      OR: [
        { blockerParentId: parentA, blockedParentId: parentB },
        { blockerParentId: parentB, blockedParentId: parentA },
      ],
    },
    select: { id: true },
  });
  return !!row;
}
