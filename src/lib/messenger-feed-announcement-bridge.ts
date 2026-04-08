/**
 * При первой публикации поста ленты команды — дублируем текст в messenger
 * `team_announcement_channel` (один канал на команду).
 */

import { prisma } from "@/lib/prisma";
import { getOrCreateTeamAnnouncementChannel } from "@/lib/messenger-service";

export async function appendFeedPostToMessengerAnnouncementChannel(opts: {
  teamId: string;
  postId: string;
  title: string;
  body: string;
  authorName: string;
}): Promise<{ conversationId: string } | null> {
  const team = await prisma.team.findUnique({
    where: { id: opts.teamId },
    select: { coachId: true },
  });
  if (!team?.coachId) {
    console.warn(
      "[messenger-feed-announcement-bridge] team has no coachId; skip messenger mirror",
      opts.teamId
    );
    return null;
  }

  let conversationId: string;
  try {
    const created = await getOrCreateTeamAnnouncementChannel(opts.teamId);
    conversationId = created.id;
  } catch {
    return null;
  }

  const title = opts.title.trim();
  const body = opts.body.trim();
  const author = opts.authorName.trim() || "Тренер";
  const headline = title ? `📢 ${title}` : "📢 Объявление";
  const text = [headline, body, `— ${author}`].join("\n\n");

  await prisma.chatMessage.create({
    data: {
      conversationId,
      senderType: "coach",
      senderId: team.coachId,
      text,
    },
  });

  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return { conversationId };
}
