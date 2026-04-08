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
  teamId?: string;
  senderName?: string;
  previewText?: string;
  badge?: number;
  collapseId?: string;
  threadIdentifier?: string;
  notifySection?: string;
  trainingId?: string;
  postId?: string;
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
  if (data.teamId) payload.teamId = data.teamId;
  if (data.senderName) payload.senderName = data.senderName;
  if (data.previewText) payload.previewText = data.previewText;
  if (data.collapseId) payload.collapseId = data.collapseId;
  if (data.threadIdentifier) payload.threadIdentifier = data.threadIdentifier;
  if (data.notifySection) payload.notifySection = data.notifySection;
  if (data.trainingId) payload.trainingId = data.trainingId;
  if (data.postId) payload.postId = data.postId;

  return {
    title: data.title,
    body: data.body,
    data: payload,
  };
}
