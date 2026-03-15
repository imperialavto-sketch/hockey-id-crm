import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Sparkles } from "lucide-react-native";
import { colors, spacing, radius } from "@/constants/theme";

type Props = { text: string };

export function AIInsightCard({ text }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(28);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    translateY.value = withTiming(0, {
      duration: 700,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <View style={styles.card}>
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[
            "rgba(56, 189, 248, 0.15)",
            "rgba(37, 99, 235, 0.1)",
            "transparent",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.gradient]}
        />
        <View style={styles.edgeGlow} />
        <View style={styles.edgeLeft} />
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={["rgba(56, 189, 248, 0.4)", "rgba(37, 99, 235, 0.2)"]}
              style={StyleSheet.absoluteFill}
            />
            <Sparkles size={20} color="#7dd3fc" strokeWidth={2} />
          </View>
          <Text style={styles.label}>AI Insight</Text>
        </View>
        <Text style={styles.text}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl + spacing.lg,
  },
  card: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  gradient: { borderRadius: radius.xl },
  edgeGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(56, 189, 248, 0.5)",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  edgeLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "rgba(56, 189, 248, 0.4)",
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#7dd3fc",
    letterSpacing: 0.8,
  },
  text: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
    lineHeight: 24,
  },
});
