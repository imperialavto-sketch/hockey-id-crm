import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { colors, spacing, radius } from "@/constants/theme";

type Props = {
  value: number;
  label: string;
  delay?: number;
};

export function StatMiniCard({ value, label, delay = 0 }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.88);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      scale.value = withSpring(1, { damping: 14, stiffness: 120 });
      translateY.value = withTiming(0, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[styles.outer, animatedStyle]}>
      <View style={styles.card}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.12)",
            "rgba(255,255,255,0.04)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.glass]}
        />
        <View style={styles.topLine} />
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    minHeight: 80,
  },
  glass: {
    borderRadius: radius.lg - 1,
  },
  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(56, 189, 248, 0.25)",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  value: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: 6,
    letterSpacing: 0.5,
  },
});
