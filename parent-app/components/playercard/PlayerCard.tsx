import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import type { CardVariant, PlayerCardData } from "@/constants/mockPlayer";
import { colors } from "@/constants/theme";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width - 40, 340);
const CARD_HEIGHT = CARD_WIDTH * 1.42;

const VARIANT_STYLES: Record<
  CardVariant,
  {
    gradient: readonly string[];
    glow: string;
    border: string;
    badge: string;
    cornerGlow: string;
  }
> = {
  base: {
    gradient: [
      "rgba(37,99,235,0.28)",
      "rgba(37,99,235,0.1)",
      "transparent",
      "rgba(239,68,68,0.18)",
    ],
    glow: "rgba(37,99,235,0.4)",
    border: "rgba(100,149,237,0.5)",
    badge: "#3B82F6",
    cornerGlow: "rgba(37,99,235,0.35)",
  },
  elite: {
    gradient: [
      "rgba(139,92,246,0.35)",
      "rgba(37,99,235,0.2)",
      "transparent",
      "rgba(239,68,68,0.15)",
    ],
    glow: "rgba(139,92,246,0.5)",
    border: "rgba(167,139,250,0.6)",
    badge: "#A78BFA",
    cornerGlow: "rgba(139,92,246,0.4)",
  },
  tournament: {
    gradient: [
      "rgba(251,191,36,0.32)",
      "rgba(245,158,11,0.18)",
      "transparent",
      "rgba(239,68,68,0.22)",
    ],
    glow: "rgba(251,191,36,0.5)",
    border: "rgba(251,191,36,0.65)",
    badge: "#FBBF24",
    cornerGlow: "rgba(251,191,36,0.4)",
  },
  future_star: {
    gradient: [
      colors.accentSoft,
      "rgba(139,92,246,0.22)",
      "transparent",
      colors.accentSoft,
    ],
    glow: colors.accentSoft,
    border: colors.border,
    badge: colors.accent,
    cornerGlow: colors.accentSoft,
  },
};

interface PlayerCardProps {
  player: PlayerCardData;
  variant: CardVariant;
  scaleAnim: Animated.Value;
}

export function PlayerCard({ player, variant, scaleAnim }: PlayerCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const style = VARIANT_STYLES[variant];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const animatedStyle = {
    opacity,
    transform: [
      { translateY },
      {
        scale: scaleAnim.interpolate({
          inputRange: [0.98, 1],
          outputRange: [0.98, 1],
        }),
      },
    ],
  };

  const OVRBadge = (
    <View style={[styles.ovrWrap, { borderColor: style.badge }]}>
      <LinearGradient
        colors={[`${style.badge}40`, `${style.badge}15`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.ovrLabel}>OVR</Text>
      <Text style={[styles.ovrValue, { color: style.badge }]}>{player.ovr}</Text>
    </View>
  );

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <View style={[styles.glowOuter, { backgroundColor: style.glow }]} />
      <View style={[styles.card, { borderColor: style.border }]}>
        <LinearGradient
          colors={["rgba(255,255,255,0.08)", "transparent", "rgba(0,0,0,0.1)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.borderGlow}
        />
        <View style={[styles.cornerAccent, styles.cornerTL, { backgroundColor: style.cornerGlow }]} />
        <View style={[styles.cornerAccent, styles.cornerBR, { backgroundColor: style.cornerGlow }]} />
        <ImageBackground
          source={{ uri: player.image }}
          style={styles.image}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={["transparent", "rgba(2,6,23,0.2)", "rgba(2,6,23,0.9)"]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={style.gradient as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {Platform.OS === "web" ? (
            <View style={[styles.ovrPosition, styles.ovrWeb]}>
              {OVRBadge}
            </View>
          ) : (
            <BlurView intensity={28} tint="dark" style={styles.ovrPosition}>
              {OVRBadge}
            </BlurView>
          )}
          <View style={styles.bottom}>
            <Text style={styles.number}>{player.number}</Text>
            <Text style={styles.name}>{player.name}</Text>
            <Text style={styles.meta}>
              {player.team}  •  {player.position}
            </Text>
          </View>
        </ImageBackground>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  glowOuter: {
    position: "absolute",
    width: CARD_WIDTH + 56,
    height: CARD_HEIGHT + 56,
    borderRadius: 36,
    opacity: 0.42,
    top: -28,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 2,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 16,
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    pointerEvents: "none",
  },
  cornerAccent: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 12,
    opacity: 0.35,
    zIndex: 1,
    pointerEvents: "none",
  },
  cornerTL: { top: 12, left: 12 },
  cornerBR: { bottom: 12, right: 12 },
  image: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
  },
  imageStyle: {
    borderRadius: 26,
  },
  ovrPosition: {
    position: "absolute",
    top: 16,
    right: 16,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  ovrWeb: {
    backgroundColor: "rgba(2,6,23,0.85)",
  },
  ovrWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    overflow: "hidden",
  },
  ovrLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  ovrValue: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  bottom: {
    paddingTop: 8,
  },
  number: {
    color: "rgba(255,255,255,0.98)",
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 52,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  name: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: -4,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  meta: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
});
