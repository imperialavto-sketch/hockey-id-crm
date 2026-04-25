import type { AppNotificationItem, AppNotificationType } from "@/types/notification";

const APP_TYPES = [
  "chat_message",
  "parent_chat_message",
  "parent_peer_message",
  "team_parent_channel_message",
  "team_announcement",
  "coach_mark_post_training",
  "schedule_update",
  "ai_analysis_ready",
  "achievement_unlocked",
  "training_report_published",
  "player_progress_update",
  "general",
] as const satisfies readonly AppNotificationType[];

function toAppNotificationType(s?: string): AppNotificationType {
  if (s && (APP_TYPES as readonly string[]).includes(s)) {
    return s as AppNotificationType;
  }
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
    player_name?: string;
    playerName?: string;
    conversation_id?: string;
    conversationId?: string;
    achievement_code?: string;
    achievementCode?: string;
    team_id?: string;
    teamId?: string;
    post_id?: string;
    postId?: string;
    initial_message?: string;
    initialMessage?: string;
    notify_section?: string;
    notifySection?: string;
    preview_text?: string;
    previewText?: string;
    sender_name?: string;
    senderName?: string;
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
          playerName: data.player_name ?? data.playerName,
          conversationId: data.conversation_id ?? data.conversationId,
          achievementCode: data.achievement_code ?? data.achievementCode,
          teamId: data.team_id ?? data.teamId,
          postId: data.post_id ?? data.postId,
          initialMessage: data.initial_message ?? data.initialMessage,
          notifySection: data.notify_section ?? data.notifySection,
          previewText: data.preview_text ?? data.previewText,
          senderName: data.sender_name ?? data.senderName,
        }
      : undefined,
  };
}
