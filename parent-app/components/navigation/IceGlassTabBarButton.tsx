import React from "react";
import { PlatformPressable } from "@react-navigation/elements";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";

/**
 * Tab bar hit target без отдельной «подложки» у активного таба —
 * акцент только через иконку ({@link TabBarIconWithAttention}) и цвет лейбла.
 */
export function IceGlassTabBarButton(props: BottomTabBarButtonProps) {
  return <PlatformPressable {...props} />;
}
