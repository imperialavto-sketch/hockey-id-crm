import React, { useEffect } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

export interface SkeletonBlockProps {
  height: number;
  width?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Reusable animated pulsing skeleton block for loading states.
 */
export function SkeletonBlock({
  height,
  width = "100%",
  borderRadius = 12,
  style,
}: SkeletonBlockProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          height,
          width,
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius,
        },
        style,
        animStyle,
      ]}
    />
  );
}
