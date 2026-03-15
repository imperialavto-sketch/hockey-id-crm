import type { AppNotificationItem, AppNotificationType } from "@/types/notification";

const APP_TYPES: AppNotificationType[] = [
  "chat_message",
  "schedule_update",
  "ai_analysis_ready",
  "achievement_unlocked",
  "general",
];

function toAppNotificationType(s?: string): AppNotificationType {
  if (s && APP_TYPES.includes(s as AppNotificationType)) return s as AppNotificationType;
  return "general";
}

/** API notification shape (snake_case or camelCase). */
export interface ApiNotification {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  created_at?: string;
  createdAt?: string;
  is_read?: boolean;
  isRead?: boolean;
  data?: {
    player_id?: string;
    playerId?: string;
    conversation_id?: string;
    conversationId?: string;
    achievement_code?: string;
    achievementCode?: string;
  };
}

export function mapApiNotificationToAppItem(raw: ApiNotification): AppNotificationItem {
  const data = raw.data;
  return {
    id: String(raw.id),
    type: toAppNotificationType(raw.type),
    title: raw.title ?? "",
    body: raw.body ?? "",
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    isRead: raw.is_read ?? raw.isRead ?? false,
    data: data
      ? {
          playerId: data.player_id ?? data.playerId,
          conversationId: data.conversation_id ?? data.conversationId,
          achievementCode: data.achievement_code ?? data.achievementCode,
        }
      : undefined,
  };
}
