/**
 * Handles push tap → conversation deep link. Native only.
 */

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { navigateFromCoachPushData } from "@/lib/coachNotificationNavigation";
import { shouldSkipDuplicateNotificationTap } from "@/lib/pushNotificationTapDedupe";

export function CoachPushNotificationHandler() {
  const router = useRouter();
  const navigationReadyRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let cancelled = false;
    void import("expo-notifications").then((Notifications) => {
      if (cancelled) return;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;

    navigationReadyRef.current = true;

    void import("expo-notifications")
      .then(async (Notifications) => {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (!response || !navigationReadyRef.current) return;
        if (!shouldSkipDuplicateNotificationTap(response)) {
          const data = response.notification.request.content.data as
            | Record<string, unknown>
            | undefined;
          navigateFromCoachPushData(router, data);
        }
        await Notifications.clearLastNotificationResponseAsync();
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

    void import("expo-notifications")
      .then((Notifications) => {
        if (cancelled) return null;
        return Notifications.addNotificationResponseReceivedListener((response) => {
          if (!navigationReadyRef.current) return;
          if (shouldSkipDuplicateNotificationTap(response)) return;
          const data = response.notification.request.content.data as
            | Record<string, unknown>
            | undefined;
          navigateFromCoachPushData(router, data);
        });
      })
      .then((sub) => {
        if (cancelled && sub) sub.remove();
        else if (sub) subscription = sub;
      })
      .catch((err) => console.warn("[CoachPushNotificationHandler] setup failed:", err));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [router]);

  return null;
}
