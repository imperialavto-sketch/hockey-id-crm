import { prisma } from "@/lib/prisma";
import {
  chatPushCollapseKey,
  resolveParentSenderName,
  truncateBody,
  truncatePreview,
} from "@/lib/notifications/chatPushDisplay";
import { getParentPushAppBadgeCount } from "@/lib/notifications/pushAppBadgeCount";
import { sendPushToParent } from "@/lib/notifications/sendPush";

/**
 * Пуш всем родителям команды (кроме отправителя) при сообщении в team_parent_channel.
 */
export async function notifyTeamParentChannelMessage(opts: {
  teamId: string;
  senderParentId: string;
  conversationId: string;
  text: string;
}): Promise<void> {
  const t = opts.text.trim();
  try {
    const links = await prisma.parentPlayer.findMany({
      where: { player: { teamId: opts.teamId } },
      select: { parentId: true },
    });
    const recipientIds = new Set(links.map((l) => l.parentId));
    recipientIds.delete(opts.senderParentId);

    const senderName = await resolveParentSenderName(opts.senderParentId);
    const previewText = truncatePreview(t);
    const bodyLine = truncateBody(t) || "Сообщение в чате команды";
    const collapseKey = chatPushCollapseKey(opts.conversationId);

    for (const pid of recipientIds) {
      const badge = await getParentPushAppBadgeCount(pid);
      void sendPushToParent(pid, {
        type: "team_parent_channel_message",
        title: senderName,
        body: bodyLine,
        conversationId: opts.conversationId,
        teamId: opts.teamId,
        senderName,
        previewText: previewText || bodyLine,
        badge,
        collapseId: collapseKey,
        threadIdentifier: collapseKey,
      });
    }
  } catch (e) {
    console.error("[notifyTeamParentChannelMessage] push failed:", e);
  }
}
