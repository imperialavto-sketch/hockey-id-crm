/**
 * Hook to set up push notifications: permissions, token, registration.
 */

import { useEffect, useRef, useState } from "react";
import { getExpoPushToken, getPlatform } from "@/lib/notifications";
import { apiFetch } from "@/lib/api";
import Constants from "expo-constants";

const PARENT_ID_HEADER = "x-parent-id";

export function usePushNotifications(parentId: string | undefined) {
  const [token, setToken] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const lastRegisteredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!parentId) return;

    let cancelled = false;

    (async () => {
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

        await apiFetch("/api/parent/push/register", {
          method: "POST",
          headers: { [PARENT_ID_HEADER]: parentId },
          body: JSON.stringify({
            expoPushToken: expoToken,
            platform: getPlatform(),
            appVersion: Constants.expoConfig?.version ?? "1.0.0",
          }),
        });
      } catch (err) {
        console.warn("[usePushNotifications] failed:", err);
        lastRegisteredRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parentId]);

  return { token, permissionDenied };
}
