/**
 * Notification service for in-app notification list.
 */
import type { AppNotificationItem } from "@/types/notification";
import { apiFetch } from "@/lib/api";
import { mapApiNotificationToAppItem, type ApiNotification } from "@/mappers/notificationMapper";

const PARENT_ID_HEADER = "x-parent-id";

/** Fetch notifications for parent. GET /api/notifications with x-parent-id header. */
export async function getNotifications(
  parentId: string | undefined | null
): Promise<AppNotificationItem[]> {
  if (!parentId) return [];
  const data = await apiFetch<ApiNotification[] | unknown>("/api/notifications", {
    headers: { [PARENT_ID_HEADER]: parentId },
  });
  if (!Array.isArray(data)) return [];
  const items = data.map((item) => mapApiNotificationToAppItem(item as ApiNotification));
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Mark notification as read. Optimistic; no API yet. */
export async function markNotificationAsRead(
  _id: string,
  _parentId?: string | null
): Promise<void> {
  // Future: PATCH /api/notifications/:id/read
}
