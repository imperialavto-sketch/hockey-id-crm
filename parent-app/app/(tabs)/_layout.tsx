import { useEffect, useState } from "react";
import { View, Platform, InteractionManager } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { DeferredPushSetup } from "@/components/DeferredPushSetup";
import { PushNotificationHandler } from "@/components/PushNotificationHandler";
import { GlassTabBarBackground } from "@/components/navigation/GlassTabBarBackground";
import { FloatingGlassTabBar } from "@/components/navigation/FloatingGlassTabBar";
import { colors, spacing } from "@/constants/theme";

const PUSH_DEFER_MS = 1500;

function DeferredPushMount({ parentId }: { parentId: string | undefined }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (__DEV__) console.time("[Startup] Push ready");
    const task = InteractionManager.runAfterInteractions(() => {
      const t = setTimeout(() => setMounted(true), PUSH_DEFER_MS);
      return () => clearTimeout(t);
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (mounted && __DEV__) console.timeEnd("[Startup] Push ready");
  }, [mounted]);

  if (!mounted) return null;
  return (
    <>
      <DeferredPushSetup parentId={parentId} />
      <PushNotificationHandler />
    </>
  );
}

const TABS = [
  { name: "index", label: "Главная", icon: "home" as const },
  { name: "feed", label: "Лента", icon: "newspaper" as const },
  { name: "marketplace", label: "Тренеры", icon: "fitness" as const },
  { name: "player", label: "Игрок", icon: "person" as const },
  { name: "schedule", label: "План", icon: "calendar" as const },
  { name: "profile", label: "Профиль", icon: "person-circle" as const },
  { name: "chat", label: "Чат", icon: "chatbubbles" as const },
];

export default function TabsLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <>
      {Platform.OS !== "web" && <DeferredPushMount parentId={user?.id} />}
      <Tabs
        tabBar={(props) => <FloatingGlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: "transparent" },
          tabBarBackground: () => <GlassTabBarBackground />,
          tabBarStyle: {
            position: "absolute",
            left: spacing.xxl,
            right: spacing.xxl,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.05)",
            backgroundColor: "transparent",
            borderRadius: 999,
            elevation: 0,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarActiveBackgroundColor: "transparent",
          tabBarInactiveBackgroundColor: "transparent",
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "500",
            maxWidth: "100%",
            textAlign: "center",
          },
          tabBarIconStyle: { marginBottom: 2, alignSelf: "center" },
          tabBarItemStyle: {
            minWidth: 32,
            flex: 1,
            paddingVertical: 6,
            paddingHorizontal: 2,
            alignItems: "center",
            justifyContent: "center",
          },
          tabBarAllowFontScaling: false,
          tabBarShowLabel: true,
        }}
      >
        {TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.label,
              tabBarLabel: t.label,
              tabBarIcon: ({ color, focused, size }) => (
                <View style={[
                  { alignItems: "center", justifyContent: "center" },
                  focused && { transform: [{ translateY: -2 }] },
                ]}>
                  <Ionicons
                    name={t.icon}
                    size={focused ? 22 : (size ?? 20)}
                    color={color}
                  />
                </View>
              ),
              tabBarAccessibilityLabel: t.label,
            }}
          />
        ))}
      </Tabs>
    </>
  );
}
