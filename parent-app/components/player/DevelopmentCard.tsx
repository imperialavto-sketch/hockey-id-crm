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
import { colors, spacing, radius } from "@/constants/theme";

type Skill = { label: string; value: number };
type Props = { skills: Skill[] };

export function DevelopmentCard({ skills }: Props) {
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

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, containerStyle]}>
      <View style={styles.card}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.08)",
            "rgba(255,255,255,0.02)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.glass]}
        />
        <View style={styles.topLine} />
        <Text style={styles.title}>Player Development</Text>
        <View style={styles.skills}>
          {skills.map((skill, i) => (
            <SkillRow key={skill.label} skill={skill} delay={i * 100} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function SkillRow({ skill, delay }: { skill: Skill; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(() => {
      progress.value = withTiming(skill.value / 100, {
        duration: 1300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }, delay);
    return () => clearTimeout(t);
  }, [skill.value, delay]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{skill.label}</Text>
        <Text style={styles.value}>{skill.value}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.bar, barStyle]}>
          <LinearGradient
            colors={[colors.primary, colors.accent, colors.cyan]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.barGlow} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  card: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  glass: {
    borderRadius: radius.xl - 1,
  },
  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(37, 99, 235, 0.3)",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    letterSpacing: -0.3,
  },
  skills: { gap: spacing.lg },
  row: { marginBottom: spacing.md },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  value: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  track: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: radius.full,
    overflow: "hidden",
    position: "relative",
  },
  barGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
});
