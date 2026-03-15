import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { spacing } from "@/constants/theme";

export function FloatingGlassTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const barHeight = 64 + insets.bottom + 12;

  const tabBarStyle = {
    position: "absolute" as const,
    left: spacing.xxl,
    right: spacing.xxl,
    bottom: insets.bottom + 12,
    height: barHeight,
    paddingTop: 8,
    paddingBottom: insets.bottom + 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    backgroundColor: "transparent",
    borderRadius: 999,
    overflow: "visible" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    elevation: 0,
  };

  return <BottomTabBar {...props} style={tabBarStyle} />;
}
