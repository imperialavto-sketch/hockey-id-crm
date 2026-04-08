/**
 * Registers Expo push token with POST /api/coach/push/register (Bearer auth).
 */

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getExpoPushToken, getPlatform } from "@/lib/notifications";
import Constants from "expo-constants";

export function useCoachPushNotifications(enabled: boolean) {
  const [token, setToken] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const lastRegisteredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void (async () => {
      try {
        const expoToken = await getExpoPushToken();
        if (cancelled) return;

        if (!expoToken) {
          setPermissionDenied(true);
          return;
        }

        setToken(expoToken);

        if (lastRegisteredRef.current === expoToken) return;
        lastRegisteredRef.current = expoToken;

        await apiFetch("/api/coach/push/register", {
          method: "POST",
          body: JSON.stringify({
            expoPushToken: expoToken,
            platform: getPlatform(),
            appVersion: Constants.expoConfig?.version ?? "1.0.0",
          }),
        });
      } catch (err) {
        console.warn("[useCoachPushNotifications] failed:", err);
        lastRegisteredRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { token, permissionDenied };
}
