/**
 * Registers push token when user is authenticated.
 * Shows optional permission prompt text (handled by OS).
 */

import { useEffect } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Props {
  parentId: string | undefined;
}

export function PushNotificationSetup({ parentId }: Props) {
  usePushNotifications(parentId);
  return null;
}
