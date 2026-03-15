/**
 * Push notification utilities — Expo Notifications.
 * Returns false/null on web and simulator; all methods are safe (try/catch).
 */

import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

const isWeb = Platform.OS === "web";

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isWeb) return false;
  if (!Device.isDevice) return false;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (err) {
    console.error("[notifications] requestNotificationPermissions:", err);
    return false;
  }
}

export async function getExpoPushToken(): Promise<string | null> {
  if (isWeb) return null;
  if (!Device.isDevice) return null;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const projectId = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID ?? process.env.EXPO_PUBLIC_PROJECT_ID;

    if (!projectId) {
      console.warn(
        "[notifications] EXPO_PUBLIC_EXPO_PROJECT_ID missing. Add it to .env for expo push. Skipping token."
      );
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData?.data ?? null;
  } catch (err) {
    console.error("[notifications] getExpoPushToken:", err);
    return null;
  }
}

export function getPlatform(): string {
  return Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
}
