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

const EASE = Easing.inOut(Easing.sin);

/**
 * Player screen background — deep navy, ice blue glow, minimal.
 * Clean, expensive, no noise. Arena atmosphere.
 */
export function PlayerScreenBackground() {
  const t1 = useSharedValue(0);
  const t2 = useSharedValue(0);

  useEffect(() => {
    t1.value = withRepeat(withTiming(1, { duration: 22000, easing: EASE }), -1, true);
    t2.value = withRepeat(withTiming(1, { duration: 26000, easing: EASE }), -1, true);
  }, [t1, t2]);

  const g1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: t1.value * 40 - 20 },
      { translateY: (1 - t1.value) * 30 - 15 },
      { scale: 0.9 + t1.value * 0.15 },
    ],
    opacity: 0.1 + t1.value * 0.03,
  }));

  const g2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: (1 - t2.value) * 35 - 18 },
      { translateY: t2.value * 40 - 20 },
      { scale: 0.85 + (1 - t2.value) * 0.2 },
    ],
    opacity: 0.06 + t2.value * 0.025,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={["#020916", "#05101d", "#071225", "#030a14"]}
        locations={[0, 0.4, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.glow, styles.g1, g1]}>
        <LinearGradient
          colors={[
            "rgba(56,189,248,0.12)",
            "rgba(34,211,238,0.04)",
            "transparent",
          ]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>
      <Animated.View style={[styles.glow, styles.g2, g2]}>
        <LinearGradient
          colors={[
            "rgba(148,163,184,0.06)",
            "rgba(100,116,139,0.02)",
            "transparent",
          ]}
          style={StyleSheet.absoluteFill}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
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
  g1: { width: 380, height: 380, top: "-8%", left: "10%" },
  g2: { width: 320, height: 320, bottom: "5%", right: "-10%" },
});
