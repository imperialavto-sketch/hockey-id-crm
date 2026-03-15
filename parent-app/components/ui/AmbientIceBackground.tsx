import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Ambient ice background — subtle premium glow shapes.
 * Deep navy / ice blue / violet, slow infinite motion, NHL-level depth.
 */
export function AmbientIceBackground() {
  const t1 = useSharedValue(0);
  const t2 = useSharedValue(0);
  const t3 = useSharedValue(0);

  useEffect(() => {
    const easing = Easing.inOut(Easing.sin);
    const duration = 12000;
    t1.value = withRepeat(
      withTiming(1, { duration, easing }),
      -1,
      true
    );
    t2.value = withRepeat(
      withTiming(1, { duration: 14000, easing }),
      -1,
      true
    );
    t3.value = withRepeat(
      withTiming(1, { duration: 16000, easing }),
      -1,
      true
    );
  }, [t1, t2, t3]);

  const glow1Style = useAnimatedStyle(() => {
    const x = t1.value * 30 - 15;
    const y = t1.value * 20 - 10;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: 0.9 + t1.value * 0.2 },
      ],
      opacity: 0.25 + t1.value * 0.1,
    };
  });

  const glow2Style = useAnimatedStyle(() => {
    const x = (1 - t2.value) * 25 - 12;
    const y = t2.value * 35 - 17;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: 0.85 + (1 - t2.value) * 0.25 },
      ],
      opacity: 0.18 + t2.value * 0.08,
    };
  });

  const glow3Style = useAnimatedStyle(() => {
    const x = t3.value * 20 - 10;
    const y = (1 - t3.value) * 30 - 15;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: 0.8 + t3.value * 0.3 },
      ],
      opacity: 0.12 + (1 - t3.value) * 0.05,
    };
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.glow, styles.glow1, glow1Style]}>
        <LinearGradient
          colors={["rgba(59,130,246,0.35)", "rgba(96,165,250,0.15)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
        />
      </Animated.View>
      <Animated.View style={[styles.glow, styles.glow2, glow2Style]}>
        <LinearGradient
          colors={["rgba(99,102,241,0.25)", "rgba(139,92,246,0.1)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      <Animated.View style={[styles.glow, styles.glow3, glow3Style]}>
        <LinearGradient
          colors={["rgba(6,182,212,0.2)", "rgba(59,130,246,0.08)", "transparent"]}
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
  glow1: {
    width: 280,
    height: 280,
    top: "15%",
    left: "-10%",
  },
  glow2: {
    width: 320,
    height: 320,
    bottom: "20%",
    right: "-15%",
  },
  glow3: {
    width: 220,
    height: 220,
    top: "45%",
    left: "20%",
  },
});
