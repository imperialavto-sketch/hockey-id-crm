import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { colors, spacing, radius, typography } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  title: string;
  coach: string;
  date: string;
  time: string;
  location: string;
  onBookPress?: () => void;
};

export function TrainingCard({
  title,
  coach,
  date,
  time,
  location,
  onBookPress,
}: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(28);
  const scale = useSharedValue(1);

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

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, containerStyle]}>
      <View style={styles.card}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[
            colors.accentSoft,
            "rgba(59,130,246,0.06)",
            "transparent",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.accent]}
        />
        <View style={styles.topLine} />
        <View style={styles.content}>
          <View style={styles.avatar}>
            <LinearGradient
              colors={[colors.surfaceLevel2, colors.surfaceLevel1]}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="person-outline" size={24} color={colors.textSecondary} />
          </View>
          <View style={styles.main}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.coach}>{coach}</Text>
            <View style={styles.details}>
              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>{date} · {time}</Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>{location}</Text>
              </View>
            </View>
            <AnimatedPressable
              onPress={onBookPress}
              onPressIn={() => scale.value = withSpring(0.96)}
              onPressOut={() => scale.value = withSpring(1)}
              style={[styles.cta, buttonStyle]}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentSecondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaInner}
              >
                <View style={styles.ctaGlow} />
                <Text style={styles.ctaText}>Book training</Text>
              </LinearGradient>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  accent: { borderRadius: radius.lg },
  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(59,130,246,0.35)",
  },
  content: {
    flexDirection: "row",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  main: { flex: 1 },
  title: {
    ...typography.cardTitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  coach: {
    ...typography.bodySmall,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  details: { gap: spacing.sm, marginBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  detailText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  cta: {
    borderRadius: radius.sm,
    overflow: "hidden",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
  },
  ctaInner: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minWidth: 150,
    alignItems: "center",
    position: "relative",
  },
  ctaGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  ctaText: {
    ...typography.bodySmall,
    fontSize: 15,
    fontWeight: "700",
    color: colors.onAccent,
  },
});
