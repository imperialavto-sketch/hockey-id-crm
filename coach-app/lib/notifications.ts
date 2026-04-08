/**
 * Expo push — coach app. Safe on web / simulator (returns null).
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
    console.error("[coach-notifications] requestNotificationPermissions:", err);
    return false;
  }
}

export async function getExpoPushToken(): Promise<string | null> {
  if (isWeb) return null;
  if (!Device.isDevice) return null;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const projectId =
      process.env.EXPO_PUBLIC_EXPO_PROJECT_ID ?? process.env.EXPO_PUBLIC_PROJECT_ID;

    if (!projectId) {
      console.warn(
        "[coach-notifications] EXPO_PUBLIC_EXPO_PROJECT_ID missing; cannot obtain push token."
      );
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData?.data ?? null;
  } catch (err) {
    console.error("[coach-notifications] getExpoPushToken:", err);
    return null;
  }
}

export function getPlatform(): string {
  return Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
}
