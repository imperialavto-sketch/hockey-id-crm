/**
 * Build Expo push notification payloads by type.
 */

import type { AppNotificationType } from "@/types/notification";

export interface NotificationData {
  type: AppNotificationType;
  title: string;
  body: string;
  playerId?: string;
  conversationId?: string;
  achievementCode?: string;
}

export function buildNotificationPayload(
  data: NotificationData
): { title: string; body: string; data: Record<string, string> } {
  const payload: Record<string, string> = {
    type: data.type,
  };
  if (data.playerId) payload.playerId = data.playerId;
  if (data.conversationId) payload.conversationId = data.conversationId;
  if (data.achievementCode) payload.achievementCode = data.achievementCode;

  return {
    title: data.title,
    body: data.body,
    data: payload,
  };
}
