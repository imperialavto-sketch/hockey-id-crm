export default {
  expo: {
    name: "Hockey ID Parent",
    extra: {
      eas: {
        projectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID,
      },
    },
    slug: "hockey-id-parent",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    scheme: "hockeyid",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0a0a0f",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.hockeyid.parent",
      infoPlist: {
        NSUserNotificationsUsageDescription:
          "Разрешите уведомления, чтобы получать сообщения от тренера, изменения расписания и важные обновления по игроку.",
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#0a0a0f",
      },
      package: "com.hockeyid.parent",
      permissions: ["RECEIVE_BOOT_COMPLETED", "VIBRATE"],
    },
    plugins: [
      "expo-asset",
      "expo-font",
      "expo-router",
      [
        "expo-notifications",
        {
          sounds: [],
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
