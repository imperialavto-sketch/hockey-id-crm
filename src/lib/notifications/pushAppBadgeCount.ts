/**
 * App icon badge totals for Expo push (iOS) and client sync.
 * Parent: direct coach chat unread + team announcements inbox + in-app Notification rows.
 * Coach: unread parent messages across all conversations for this coach.
 */

import { prisma } from "@/lib/prisma";
import { listParentAnnouncementInboxChannels } from "@/lib/parent-team-announcements";
import { countParentMessengerUnread } from "@/lib/messenger-parent-conversations-list";

export async function getParentPushAppBadgeCount(
  parentId: string
): Promise<number> {
  const [messengerUnread, notifUnread, inbox] = await Promise.all([
    countParentMessengerUnread(parentId),
    prisma.notification.count({
      where: { parentId, read: false },
    }),
    listParentAnnouncementInboxChannels(parentId),
  ]);
  const teamUnread =
    inbox.ok
      ? inbox.channels.reduce((s, ch) => s + (ch.unreadCount ?? 0), 0)
      : 0;
  return messengerUnread + notifUnread + teamUnread;
}

export async function getCoachPushAppBadgeCount(
  coachId: string
): Promise<number> {
  return prisma.chatMessage.count({
    where: {
      readAt: null,
      senderType: "parent",
      conversation: { coachId },
    },
  });
}
