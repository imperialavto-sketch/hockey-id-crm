/**
 * Defers push notification setup until after first paint.
 * Uses dynamic import so expo-notifications loads only when needed (not at parse time).
 */

import React, { Suspense, useEffect, useState } from "react";
import { Platform } from "react-native";

const DEFER_MS = 2000;

const PushNotificationSetupLazy = React.lazy(() =>
  import("./PushNotificationSetup").then((m) => ({ default: m.PushNotificationSetup }))
);

interface Props {
  parentId: string | undefined;
}

export function DeferredPushSetup({ parentId }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const t = setTimeout(() => setMounted(true), DEFER_MS);
    return () => clearTimeout(t);
  }, []);

  if (!mounted || !parentId) return null;
  return (
    <Suspense fallback={null}>
      <PushNotificationSetupLazy parentId={parentId} />
    </Suspense>
  );
}
