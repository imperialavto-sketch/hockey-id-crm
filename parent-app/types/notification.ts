export type AppNotificationType =
  | "chat_message"
  | "schedule_update"
  | "ai_analysis_ready"
  | "achievement_unlocked"
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
    conversationId?: string;
    achievementCode?: string;
  };
}
