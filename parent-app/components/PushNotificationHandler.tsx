/**
 * Handles push notification tap and navigation.
 * Must be mounted inside a router context.
 * No-op on web (expo-notifications is native only).
 */

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";

function navigateFromNotification(
  router: ReturnType<typeof useRouter>,
  data: Record<string, string> | undefined
) {
  if (!data?.type) return;
  switch (data.type) {
    case "chat_message":
      if (data.conversationId) router.push(`/chat/${data.conversationId}`);
      break;
    case "schedule_update":
      router.push("/(tabs)/schedule");
      break;
    case "ai_analysis_ready":
    case "achievement_unlocked":
      if (data.playerId) router.push(`/player/${data.playerId}`);
      else router.push("/(tabs)");
      break;
    default:
      router.push("/(tabs)");
      break;
  }
}

export function PushNotificationHandler() {
  const router = useRouter();
  const navigationReadyRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    navigationReadyRef.current = true;

    import("expo-notifications")
      .then((Notifications) =>
        Notifications.getLastNotificationResponseAsync()
      )
      .then((response) => {
        if (response && navigationReadyRef.current) {
          const data = response.notification.request.content.data as Record<string, string> | undefined;
          navigateFromNotification(router, data);
        }
      })
      .catch(() => {});

    return () => {
      navigationReadyRef.current = false;
    };
  }, [router]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let cancelled = false;
    let subscription: { remove: () => void } | null = null;

    import("expo-notifications")
      .then((Notifications) => {
        if (cancelled) return null;
        return Notifications.addNotificationResponseReceivedListener((response) => {
          if (!navigationReadyRef.current) return;
          const data = response.notification.request.content.data as Record<string, string> | undefined;
          navigateFromNotification(router, data);
        });
      })
      .then((sub) => {
        if (cancelled && sub) sub.remove();
        else if (sub) subscription = sub;
      })
      .catch((err) => console.warn("[PushNotificationHandler] setup failed:", err));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [router]);

  return null;
}
