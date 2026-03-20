import type { AppNotificationItem } from "@/types/notification";
import { MOCK_NOTIFICATIONS } from "@/constants/mockNotifications";

/**
 * Demo notifications for parent app.
 * Reuses central MOCK_NOTIFICATIONS and keeps shape aligned with AppNotificationItem.
 */

export function getDemoNotifications(): AppNotificationItem[] {
  return [...MOCK_NOTIFICATIONS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

