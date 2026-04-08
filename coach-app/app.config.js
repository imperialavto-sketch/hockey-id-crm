/**
 * Dynamic Expo config: EAS project id for push + expo-notifications plugin.
 * Merges legacy `app.json` so a single source of truth stays in JSON shape.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require("./app.json");

module.exports = () => {
  const expo = { ...appJson.expo };
  expo.extra = {
    ...(expo.extra || {}),
    eas: {
      projectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID,
    },
  };
  const basePlugins = Array.isArray(expo.plugins) ? [...expo.plugins] : [];
  const hasNotif = basePlugins.some(
    (p) => (Array.isArray(p) ? p[0] : p) === "expo-notifications"
  );
  if (!hasNotif) {
    basePlugins.push([
      "expo-notifications",
      {
        sounds: [],
      },
    ]);
  }
  expo.plugins = basePlugins;
  expo.ios = {
    ...expo.ios,
    infoPlist: {
      ...(expo.ios?.infoPlist || {}),
      NSUserNotificationsUsageDescription:
        "Разрешите уведомления, чтобы получать сообщения от родителей и важные обновления по команде.",
    },
  };
  const androidPerms = new Set([
    ...(expo.android?.permissions || []),
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.VIBRATE",
  ]);
  expo.android = {
    ...expo.android,
    permissions: [...androidPerms],
  };
  return { expo };
};
