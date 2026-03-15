import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

/**
 * Premium background — deep navy, subtle gradient, 2–3 soft ice/violet glows.
 * Slow ambient movement. Does not distract from content.
 */
export function PremiumBackground() {
  const t1 = useSharedValue(0);
  const t2 = useSharedValue(0);
  const t3 = useSharedValue(0);

  useEffect(() => {
    const easing = Easing.inOut(Easing.sin);
    t1.value = withRepeat(withTiming(1, { duration: 14000, easing }), -1, true);
    t2.value = withRepeat(withTiming(1, { duration: 18000, easing }), -1, true);
    t3.value = withRepeat(withTiming(1, { duration: 16000, easing }), -1, true);
  }, [t1, t2, t3]);

  const g1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: t1.value * 24 - 12 },
      { translateY: (1 - t1.value) * 16 - 8 },
      { scale: 0.92 + t1.value * 0.16 },
    ],
    opacity: 0.12 + t1.value * 0.04,
  }));

  const g2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: (1 - t2.value) * 20 - 10 },
      { translateY: t2.value * 28 - 14 },
      { scale: 0.88 + (1 - t2.value) * 0.2 },
    ],
    opacity: 0.1 + t2.value * 0.03,
  }));

  const g3 = useAnimatedStyle(() => ({
    transform: [
      { translateX: t3.value * 16 - 8 },
      { translateY: (1 - t3.value) * 20 - 10 },
      { scale: 0.85 + t3.value * 0.18 },
    ],
    opacity: 0.08 + (1 - t3.value) * 0.03,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={[
          "rgba(2,6,23,0.7)",
          "rgba(5,12,30,0.85)",
          "rgba(2,6,23,0.95)",
        ]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.glow, styles.g1, g1]}>
        <LinearGradient
          colors={["rgba(59,130,246,0.12)", "rgba(96,165,250,0.04)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
        />
      </Animated.View>
      <Animated.View style={[styles.glow, styles.g2, g2]}>
        <LinearGradient
          colors={["rgba(100,116,139,0.1)", "rgba(71,85,105,0.04)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      <Animated.View style={[styles.glow, styles.g3, g3]}>
        <LinearGradient
          colors={["rgba(148,163,184,0.08)", "rgba(100,116,139,0.03)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    borderRadius: 999,
    overflow: "hidden",
  },
  g1: { width: 260, height: 260, top: "12%", left: "-8%" },
  g2: { width: 300, height: 300, bottom: "18%", right: "-12%" },
  g3: { width: 200, height: 200, top: "48%", left: "25%" },
});
