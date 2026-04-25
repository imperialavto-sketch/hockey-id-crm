export type AppNotificationType =
  | "chat_message"
  | "parent_chat_message"
  | "parent_peer_message"
  | "team_parent_channel_message"
  | "team_announcement"
  | "coach_mark_post_training"
  | "schedule_update"
  | "ai_analysis_ready"
  | "achievement_unlocked"
  | "training_report_published"
  | "player_progress_update"
  | "general";

export interface AppNotificationItem {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  createdAt: string;
  isRead?: boolean;
  data?: {
    playerId?: string;
    playerName?: string;
    conversationId?: string;
    achievementCode?: string;
    teamId?: string;
    postId?: string;
    initialMessage?: string;
    notifySection?: string;
    previewText?: string;
    senderName?: string;
  };
}
