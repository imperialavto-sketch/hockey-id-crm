import { useCoachPushNotifications } from "@/hooks/useCoachPushNotifications";

type Props = {
  enabled: boolean;
};

export function CoachPushNotificationSetup({ enabled }: Props) {
  useCoachPushNotifications(enabled);
  return null;
}
