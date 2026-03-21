import { useEffect, useState } from "react";
import { View, Platform, InteractionManager } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { DeferredPushSetup } from "@/components/DeferredPushSetup";
import { PushNotificationHandler } from "@/components/PushNotificationHandler";
import { GlassTabBarBackground } from "@/components/navigation/GlassTabBarBackground";
import { FloatingGlassTabBar } from "@/components/navigation/FloatingGlassTabBar";
import { colors, spacing, tabBar } from "@/constants/theme";

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

const VISIBLE_TABS = [
  { name: "index", label: "Главная", icon: "home" as const },
  { name: "player", label: "Игрок", icon: "person" as const },
  { name: "schedule", label: "План", icon: "calendar" as const },
  { name: "chat", label: "Чат", icon: "chatbubbles" as const },
  { name: "more", label: "Ещё", icon: "apps" as const },
];

/** Hidden from tab bar but still navigable */
const HIDDEN_TABS = [
  { name: "feed" },
  { name: "marketplace" },
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
        key={user?.id ?? "logged-out"}
        tabBar={(props) => <FloatingGlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: "transparent" },
          tabBarBackground: () => <GlassTabBarBackground />,
          tabBarStyle: {
            position: "absolute",
            left: spacing.xl,
            right: spacing.xl,
            borderTopWidth: 0,
            backgroundColor: "transparent",
            borderRadius: 28,
            elevation: 0,
          },
          tabBarActiveTintColor: tabBar.active,
          tabBarInactiveTintColor: tabBar.inactive,
          tabBarActiveBackgroundColor: "rgba(59,130,246,0.08)",
          tabBarInactiveBackgroundColor: "transparent",
          tabBarItemStyle: {
            minWidth: 44,
            flex: 1,
            paddingVertical: 8,
            paddingHorizontal: 4,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
            marginHorizontal: 1,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
            maxWidth: "100%",
            textAlign: "center",
            letterSpacing: 0.2,
          },
          tabBarIconStyle: { marginBottom: 4, alignSelf: "center" },
          tabBarAllowFontScaling: false,
          tabBarShowLabel: true,
        }}
      >
        {VISIBLE_TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.label,
              tabBarLabel: t.label,
              tabBarIcon: ({ color }) => (
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={t.icon} size={24} color={color} />
                </View>
              ),
              tabBarAccessibilityLabel: t.label,
            }}
          />
        ))}
        {HIDDEN_TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{ href: null }}
          />
        ))}
      </Tabs>
    </>
  );
}
