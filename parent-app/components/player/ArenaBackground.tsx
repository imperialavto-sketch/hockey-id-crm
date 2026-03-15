import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const PARTICLE_COUNT = 16;

const PARTICLE_POSITIONS = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  left: ((i * 7 + 5) % 90) / 100,
  top: ((i * 11 + 8) % 85) / 100,
  size: 2 + (i % 3),
  duration: 2000 + (i % 4) * 500,
}));

const LIGHT_BEAMS: Array<{
  left?: number;
  right?: number;
  width: number;
  opacity: number;
}> = [
  { left: 0, width: 0.4, opacity: 0.06 },
  { right: 0, width: 0.35, opacity: 0.05 },
  { left: 0.2, width: 0.25, opacity: 0.04 },
  { right: 0.25, width: 0.3, opacity: 0.045 },
];

export function ArenaBackground() {
  const opacity = useSharedValue(0);
  const particleOpacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
    particleOpacity.value = withDelay(500, withTiming(0.55, { duration: 800 }));
  }, []);

  const bgStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
      <LinearGradient
        colors={["#020617", "#06142b", "#0b1f44", "#020817", "#000000"]}
        locations={[0, 0.2, 0.45, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.spotlightWrap}>
        <LinearGradient
          colors={[
            "transparent",
            "rgba(11,31,68,0.35)",
            "rgba(30,64,175,0.3)",
            "rgba(11,31,68,0.25)",
            "transparent",
          ]}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          style={styles.radialLight}
        />
      </View>

      {LIGHT_BEAMS.map((beam, i) => (
        <View
          key={i}
          style={[
            styles.lightBeam,
            {
              left: beam.left != null ? beam.left * width : undefined,
              right: beam.right != null ? beam.right * width : undefined,
              width: beam.width * width,
              opacity: beam.opacity,
            },
          ]}
        >
          <LinearGradient
            colors={[
              "transparent",
              "rgba(148,163,184,0.15)",
              "transparent",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ))}

      <View style={styles.fogLayer}>
        <LinearGradient
          colors={[
            "transparent",
            "rgba(148,163,184,0.05)",
            "rgba(148,163,184,0.03)",
            "transparent",
          ]}
          locations={[0.15, 0.4, 0.6, 0.85]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.iceOverlay} pointerEvents="none">
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.02)", "transparent"]}
          locations={[0.3, 0.5, 0.7]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {PARTICLE_POSITIONS.map((pos, i) => (
        <AnimatedParticle
          key={i}
          left={pos.left * width}
          top={pos.top * height}
          size={pos.size}
          opacityValue={particleOpacity}
          duration={pos.duration}
        />
      ))}
    </Animated.View>
  );
}

function AnimatedParticle({
  left,
  top,
  size,
  opacityValue,
  duration,
}: {
  left: number;
  top: number;
  size: number;
  opacityValue: SharedValue<number>;
  duration: number;
}) {
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, {
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.8, {
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacityValue.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left,
          top,
          width: size * 4,
          height: size * 4,
          borderRadius: size * 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  spotlightWrap: {
    position: "absolute",
    width: width * 1.3,
    height: height * 0.8,
    left: -width * 0.15,
    top: height * 0.1,
  },
  radialLight: {
    flex: 1,
    borderRadius: 9999,
  },
  lightBeam: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  fogLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  iceOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: "absolute",
    backgroundColor: "rgba(46,167,255,0.65)",
  },
});
