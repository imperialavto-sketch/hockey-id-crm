/**
 * Notification service for in-app notification list.
 */
import type { AppNotificationItem } from "@/types/notification";
import { apiFetch } from "@/lib/api";
import { mapApiNotificationToAppItem, type ApiNotification } from "@/mappers/notificationMapper";
import { withFallback } from "@/utils/withFallback";
import { getDemoNotifications } from "@/demo/demoNotifications";

/** Fetch notifications for parent. GET /api/notifications — parentId from auth only (+ demo fallback). */
export async function getNotifications(
  parentId: string | undefined | null
): Promise<AppNotificationItem[]> {
  if (!parentId) return [];
  return withFallback(
    async () => {
      const data = await apiFetch<ApiNotification[] | unknown>("/api/notifications");
      if (!Array.isArray(data)) return [];
      const items = data.map((item) => mapApiNotificationToAppItem(item as ApiNotification));
      return items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    async () => getDemoNotifications()
  );
}

/** Mark notification as read. Optimistic; safe no-op on failure. */
export async function markNotificationAsRead(
  id: string,
  _parentId?: string | null
): Promise<void> {
  if (!id) return;
  try {
    await apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "POST",
    });
  } catch {
    // ignore – UI will rely on local optimistic state; demo mode unaffected
  }
}

/** Unread in-app count for parent (GET /api/notifications/unread-count). */
export async function getUnreadNotificationCount(
  parentId: string | undefined | null
): Promise<number> {
  if (!parentId) return 0;
  return withFallback(
    async () => {
      const data = await apiFetch<{ count?: number } | unknown>(
        "/api/notifications/unread-count"
      );
      if (
        data &&
        typeof data === "object" &&
        typeof (data as { count?: unknown }).count === "number"
      ) {
        return Math.max(0, (data as { count: number }).count);
      }
      return 0;
    },
    async () => {
      const items = await getDemoNotifications();
      return items.filter((n) => !n.isRead).length;
    }
  );
}
