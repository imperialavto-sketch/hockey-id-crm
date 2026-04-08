import type { NotificationType } from "@prisma/client";

/** Типы для клиента parent-app (camelCase strings). */
export function apiNotificationTypeFromDb(
  t: NotificationType
): string {
  switch (t) {
    case "CHAT_MESSAGE":
      return "chat_message";
    case "TEAM_ANNOUNCEMENT":
      return "team_announcement";
    case "TRAINING_REPORT_PUBLISHED":
      return "training_report_published";
    case "PARENT_PROGRESS_UPDATED":
      return "player_progress_update";
    case "TRAINING_NEW":
    case "SCHEDULE_CHANGE":
      return "schedule_update";
    default:
      return "general";
  }
}

export function serializeNotificationForParentApi(n: {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: unknown;
  read: boolean;
  createdAt: Date;
}): {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data: Record<string, unknown>;
} {
  let dataObj: Record<string, unknown> = {};
  if (n.data != null && typeof n.data === "object" && !Array.isArray(n.data)) {
    dataObj = { ...(n.data as Record<string, unknown>) };
  }

  return {
    id: n.id,
    type: apiNotificationTypeFromDb(n.type),
    title: n.title,
    body: n.body ?? "",
    isRead: n.read,
    createdAt: n.createdAt.toISOString(),
    data: dataObj,
  };
}
