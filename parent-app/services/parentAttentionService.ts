/**
 * Сервисы слоя «внимания»: сообщения и уведомления отдельно.
 */

import { getConversations } from "@/services/chatService";
import { getTeamAnnouncementsInboxSummary } from "@/services/teamAnnouncementsService";
import { getUnreadNotificationCount } from "@/services/notificationService";
import { buildParentInboxList } from "@/lib/parentInboxModel";
import {
  computeMessagesAttention,
  type MessagesAttention,
} from "@/lib/parentAttention";

export async function fetchMessagesAttention(
  parentId: string
): Promise<MessagesAttention> {
  const [conversations, teamSummary] = await Promise.all([
    getConversations(parentId),
    getTeamAnnouncementsInboxSummary(parentId),
  ]);
  const inboxItems = buildParentInboxList(parentId, conversations, teamSummary);
  return computeMessagesAttention(inboxItems);
}

export async function fetchNotificationsAttention(
  parentId: string
): Promise<number> {
  return getUnreadNotificationCount(parentId);
}
