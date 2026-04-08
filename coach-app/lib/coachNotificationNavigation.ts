/**
 * Deep links from push `data` — keep in sync with server `buildNotificationPayload`.
 */

import type { Href } from "expo-router";

export type CoachNotificationRouter = {
  push: (href: Href) => void;
};

export function navigateFromCoachPushData(
  router: CoachNotificationRouter,
  data: Record<string, unknown> | undefined
): void {
  if (!data || typeof data !== "object") return;
  const type = typeof data.type === "string" ? data.type : "";
  const conversationId =
    typeof data.conversationId === "string" ? data.conversationId.trim() : "";

  switch (type) {
    case "parent_chat_message":
      if (conversationId) {
        router.push(`/conversation/${encodeURIComponent(conversationId)}` as Href);
      }
      break;
    case "coach_team_parent_channel_message":
      if (conversationId) {
        router.push(`/conversation/${encodeURIComponent(conversationId)}` as Href);
      } else {
        router.push("/(tabs)/messages" as Href);
      }
      break;
    default:
      break;
  }
}
