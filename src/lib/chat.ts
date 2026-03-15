/**
 * Chat helpers — get or create conversation for parent-coach-player.
 */

import { prisma } from "./prisma";

export async function getOrCreateConversation(
  parentId: string,
  coachId: string,
  playerId: string
) {
  let conv = await prisma.chatConversation.findUnique({
    where: {
      playerId_parentId_coachId: { playerId, parentId, coachId },
    },
    include: {
      player: { select: { firstName: true, lastName: true } },
      parent: { select: { firstName: true, lastName: true } },
      coach: { select: { firstName: true, lastName: true } },
    },
  });

  if (!conv) {
    conv = await prisma.chatConversation.create({
      data: { playerId, parentId, coachId },
      include: {
        player: { select: { firstName: true, lastName: true } },
        parent: { select: { firstName: true, lastName: true } },
        coach: { select: { firstName: true, lastName: true } },
      },
    });
  }

  return conv;
}
