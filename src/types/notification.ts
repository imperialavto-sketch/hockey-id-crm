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

export interface ExpoPushPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, string | number | boolean>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
}
