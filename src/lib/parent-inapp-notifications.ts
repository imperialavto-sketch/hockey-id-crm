/**
 * In-app уведомления для родительского приложения (БД).
 * Пуши отправляются отдельно; здесь только Notification rows.
 */

import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getParentPlayerAnchorsForTeam } from "@/lib/notifications/getParentsForTeam";
import {
  announcementKindForParent,
  pushTitleForAnnouncementKind,
} from "@/lib/team-announcements-crm";

export type ParentNotificationDataChat = {
  kind: "chat_message";
  conversationId: string;
  playerId: string;
  teamId?: string;
};

export type ParentNotificationDataTeamAnnouncement = {
  kind: "team_announcement";
  teamId: string;
  postId: string;
  announcementKind: string;
  /** ID переписки messenger (канал объявлений), если зеркалирован из ленты. */
  conversationId?: string;
  playerId?: string;
};

/** Одно непрочитанное уведомление на чат: обновляем текст и поднимаем в списке. */
export async function upsertParentChatMessageNotification(opts: {
  parentId: string;
  conversationId: string;
  playerId: string;
  teamId: string | null;
  preview: string;
}): Promise<void> {
  const title = "Новое сообщение от тренера";
  const data: ParentNotificationDataChat = {
    kind: "chat_message",
    conversationId: opts.conversationId,
    playerId: opts.playerId,
    ...(opts.teamId ? { teamId: opts.teamId } : {}),
  };

  const existing = await prisma.notification.findFirst({
    where: {
      parentId: opts.parentId,
      type: NotificationType.CHAT_MESSAGE,
      read: false,
      data: {
        path: ["conversationId"],
        equals: opts.conversationId,
      },
    },
    select: { id: true },
  });

  const json = data as unknown as Prisma.InputJsonValue;

  if (existing) {
    await prisma.notification.update({
      where: { id: existing.id },
      data: {
        title,
        body: opts.preview,
        data: json,
        playerId: opts.playerId,
        createdAt: new Date(),
      },
    });
    return;
  }

  await prisma.notification.create({
    data: {
      type: NotificationType.CHAT_MESSAGE,
      title,
      body: opts.preview,
      parentId: opts.parentId,
      playerId: opts.playerId,
      data: json,
      pushSent: false,
    },
  });
}

/** Fan-out при первой публикации объявления: один row на родителя и postId. */
export async function fanOutTeamAnnouncementInAppNotifications(opts: {
  teamId: string;
  postId: string;
  postType: string;
  postTitle: string;
  conversationId?: string;
}): Promise<void> {
  const kind = announcementKindForParent(opts.postType);
  const title = pushTitleForAnnouncementKind(kind);
  const body =
    opts.postTitle.trim().slice(0, 280) +
    (opts.postTitle.trim().length > 280 ? "…" : "");

  const recipients = await getParentPlayerAnchorsForTeam(opts.teamId);
  if (recipients.length === 0) return;

  const already = await prisma.notification.findMany({
    where: {
      type: NotificationType.TEAM_ANNOUNCEMENT,
      data: {
        path: ["postId"],
        equals: opts.postId,
      },
    },
    select: { parentId: true },
  });
  const skip = new Set(
    already.map((n) => n.parentId).filter(Boolean) as string[]
  );

  for (const { parentId, playerId } of recipients) {
    if (skip.has(parentId)) continue;

    const data: ParentNotificationDataTeamAnnouncement = {
      kind: "team_announcement",
      teamId: opts.teamId,
      postId: opts.postId,
      announcementKind: kind,
      ...(opts.conversationId ? { conversationId: opts.conversationId } : {}),
      playerId,
    };

    await prisma.notification.create({
      data: {
        type: NotificationType.TEAM_ANNOUNCEMENT,
        title,
        body,
        parentId,
        playerId,
        data: data as unknown as Prisma.InputJsonValue,
        pushSent: false,
      },
    });
  }
}
