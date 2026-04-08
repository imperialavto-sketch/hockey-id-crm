export type AppNotificationType =
  | "chat_message"
  | "schedule_update"
  | "ai_analysis_ready"
  | "achievement_unlocked"
  | "general"
  | "parent_chat_message"
  | "parent_peer_message"
  | "team_parent_channel_message"
  | "coach_team_parent_channel_message"
  | "team_announcement"
  | "new_report"
  | "progress_update"
  | "training_report_published";

export interface AppNotificationItem {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  createdAt: string;
  isRead?: boolean;
  data?: {
    playerId?: string;
    conversationId?: string;
    achievementCode?: string;
  };
}

export interface ExpoPushPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, string | number | boolean>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
}
