import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { spacing } from "@/constants/theme";

export function FloatingGlassTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomGap = 16;
  const barHeight = 56 + insets.bottom + bottomGap;

  const tabBarStyle = {
    position: "absolute" as const,
    left: spacing.xl,
    right: spacing.xl,
    bottom: insets.bottom + bottomGap,
    height: barHeight,
    paddingTop: 10,
    paddingBottom: insets.bottom + 8,
    backgroundColor: "transparent",
    borderRadius: 28,
    overflow: "visible" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderTopWidth: 0,
    elevation: 0,
    ...(Platform.OS === "android" ? { shadowOpacity: 0 } : {}),
  };

  return <BottomTabBar {...props} style={tabBarStyle} />;
}
