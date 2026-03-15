import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { Calendar, MapPin, User } from "lucide-react-native";
import { colors, spacing, radius } from "@/constants/theme";

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
            "rgba(37, 99, 235, 0.2)",
            "rgba(37, 99, 235, 0.05)",
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
              colors={["rgba(255,255,255,0.15)", "rgba(255,255,255,0.05)"]}
              style={StyleSheet.absoluteFill}
            />
            <User size={24} color={colors.textSecondary} strokeWidth={2} />
          </View>
          <View style={styles.main}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.coach}>{coach}</Text>
            <View style={styles.details}>
              <View style={styles.row}>
                <Calendar size={14} color={colors.textSecondary} strokeWidth={2} />
                <Text style={styles.detailText}>{date} · {time}</Text>
              </View>
              <View style={styles.row}>
                <MapPin size={14} color={colors.textSecondary} strokeWidth={2} />
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
                colors={[colors.primary, "#1d4ed8"]}
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
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  accent: { borderRadius: radius.xl },
  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(37, 99, 235, 0.4)",
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
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  coach: {
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
    borderRadius: radius.md,
    overflow: "hidden",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.5)",
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
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});
