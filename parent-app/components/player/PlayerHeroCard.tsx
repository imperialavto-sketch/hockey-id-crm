import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Platform,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors, spacing, radius } from "@/constants/theme";

const { width } = Dimensions.get("window");
const H_PAD = 20;
const CARD_WIDTH = width - H_PAD * 2;
const HERO_HEIGHT = 400;

const HOCKEY_IMAGE =
  "https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=1200&q=90";

type Props = {
  name: string;
  number: string;
  position: string;
  team: string;
  games: number;
  goals: number;
  assists: number;
  points: number;
};

export function PlayerHeroCard({
  name,
  number,
  position,
  team,
  games,
  goals,
  assists,
  points,
}: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(48);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 900,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    translateY.value = withTiming(0, {
      duration: 900,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const stats = [
    { value: games, label: "GP" },
    { value: goals, label: "G" },
    { value: assists, label: "A" },
    { value: points, label: "PTS" },
  ];

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <View style={[styles.cardOuter, styles.cardShadow]}>
        <View style={styles.card}>
          <ImageBackground
            source={{ uri: HOCKEY_IMAGE }}
            style={styles.image}
            resizeMode="cover"
          >
            {/* Vignette – darken edges, keep center bright */}
            <LinearGradient
              colors={[
                "rgba(0,0,0,0.5)",
                "transparent",
                "transparent",
                "rgba(0,0,0,0.4)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Bottom gradient – cinematic text legibility */}
            <LinearGradient
              colors={[
                "transparent",
                "rgba(0,0,0,0.1)",
                "rgba(0,0,0,0.5)",
                "rgba(0,0,0,0.95)",
              ]}
              locations={[0, 0.45, 0.75, 1]}
              style={StyleSheet.absoluteFill}
            />
            {/* Blue accent – top-left */}
            <LinearGradient
              colors={["rgba(37, 99, 235, 0.5)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.5 }}
              style={[StyleSheet.absoluteFill, styles.accent]}
            />
            {/* Red accent – bottom-right */}
            <LinearGradient
              colors={["transparent", "rgba(239, 68, 68, 0.35)"]}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.accent]}
            />
            {/* Edge glow – blue left, red right */}
            <View style={[styles.edgeGlow, styles.edgeLeft]} />
            <View style={[styles.edgeGlow, styles.edgeRight]} />

            <View style={styles.content}>
              <View style={styles.topRow}>
                <View style={styles.badge}>
                  <BlurView intensity={50} tint="dark" style={styles.badgeBlur} />
                  <LinearGradient
                    colors={["rgba(56, 189, 248, 0.3)", "rgba(37, 99, 235, 0.2)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.badgeGradient}
                  />
                  <Text style={styles.badgeText}>Elite Progress</Text>
                </View>
              </View>
              <Text style={styles.number}>{number}</Text>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.meta}>
                {position} · {team}
              </Text>
              <View style={styles.statRow}>
                <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={[
                    "rgba(255,255,255,0.1)",
                    "rgba(255,255,255,0.05)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, styles.statGradient]}
                />
                {stats.map((s, i) => (
                  <View key={`${s.label}-${i}`} style={styles.statItem}>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ImageBackground>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: H_PAD,
    marginBottom: spacing.xl,
  },
  cardOuter: {
    borderRadius: radius.xl,
  },
  cardShadow: Platform.select({
    ios: {
      shadowColor: "#2563EB",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
    },
    android: { elevation: 12 },
    default: {},
  }) as ViewStyle,
  card: {
    width: CARD_WIDTH,
    height: HERO_HEIGHT,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  image: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  accent: {
    borderRadius: radius.xl,
    pointerEvents: "none",
  },
  edgeGlow: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
  },
  edgeLeft: {
    left: 0,
    backgroundColor: "rgba(37, 99, 235, 0.6)",
  },
  edgeRight: {
    right: 0,
    left: undefined,
    backgroundColor: "rgba(239, 68, 68, 0.4)",
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.xl,
    paddingBottom: spacing.xl + spacing.md,
  },
  topRow: {
    position: "absolute",
    top: spacing.xl,
    left: spacing.xl,
    right: spacing.xl,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.6)",
  },
  badgeBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  badgeGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  badgeText: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  number: {
    fontSize: 72,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: 3,
    textShadowColor: "rgba(37, 99, 235, 0.9)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 4,
  },
  name: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 6,
  },
  meta: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginBottom: spacing.lg,
  },
  statRow: {
    flexDirection: "row",
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: spacing.sm,
    minHeight: 56,
  },
  statGradient: {
    borderRadius: radius.lg - 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
