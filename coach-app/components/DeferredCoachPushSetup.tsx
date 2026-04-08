/**
 * Defer push registration until after first paint (matches parent-app pattern).
 */

import React, { Suspense, useEffect, useState } from "react";
import { Platform } from "react-native";

const DEFER_MS = 2000;

const LazySetup = React.lazy(() =>
  import("./CoachPushNotificationSetup").then((m) => ({
    default: m.CoachPushNotificationSetup,
  }))
);

type Props = {
  enabled: boolean;
};

export function DeferredCoachPushSetup({ enabled }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const t = setTimeout(() => setMounted(true), DEFER_MS);
    return () => clearTimeout(t);
  }, []);

  if (!mounted || !enabled) return null;
  return (
    <Suspense fallback={null}>
      <LazySetup enabled={enabled} />
    </Suspense>
  );
}
