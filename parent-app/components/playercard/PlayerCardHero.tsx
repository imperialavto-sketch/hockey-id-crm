import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import type { CardVariant, PlayerCardData } from "@/constants/mockPlayer";
import { colors } from "@/constants/theme";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width - 40, 336);
const CARD_HEIGHT = CARD_WIDTH * 1.45;

const VARIANT_STYLES: Record<
  CardVariant,
  {
    gradient: readonly string[];
    glow: string;
    border: string;
    borderInner: string;
    badge: string;
    badgeGlow: string;
    cornerGlow: string;
  }
> = {
  base: {
    gradient: [
      "rgba(37,99,235,0.22)",
      "rgba(37,99,235,0.08)",
      "transparent",
      "rgba(239,68,68,0.12)",
    ],
    glow: "rgba(37,99,235,0.35)",
    border: "rgba(255,255,255,0.22)",
    borderInner: "rgba(255,255,255,0.06)",
    badge: "#3B82F6",
    badgeGlow: "rgba(59,130,246,0.4)",
    cornerGlow: "rgba(37,99,235,0.2)",
  },
  elite: {
    gradient: [
      "rgba(139,92,246,0.28)",
      "rgba(37,99,235,0.15)",
      "transparent",
      "rgba(239,68,68,0.12)",
    ],
    glow: "rgba(139,92,246,0.45)",
    border: "rgba(167,139,250,0.55)",
    borderInner: "rgba(167,139,250,0.15)",
    badge: "#A78BFA",
    badgeGlow: "rgba(167,139,250,0.5)",
    cornerGlow: "rgba(139,92,246,0.25)",
  },
  tournament: {
    gradient: [
      "rgba(251,191,36,0.25)",
      "rgba(245,158,11,0.12)",
      "transparent",
      "rgba(239,68,68,0.18)",
    ],
    glow: "rgba(251,191,36,0.4)",
    border: "rgba(251,191,36,0.6)",
    borderInner: "rgba(251,191,36,0.12)",
    badge: "#FBBF24",
    badgeGlow: "rgba(251,191,36,0.5)",
    cornerGlow: "rgba(245,158,11,0.3)",
  },
  future_star: {
    gradient: [
      colors.accentSoft,
      "rgba(139,92,246,0.18)",
      "transparent",
      colors.accentSoft,
    ],
    glow: colors.accentSoft,
    border: colors.border,
    borderInner: colors.accentSoft,
    badge: colors.accent,
    badgeGlow: colors.accentSoft,
    cornerGlow: colors.accentSoft,
  },
};

interface PlayerCardHeroProps {
  player: PlayerCardData;
  variant: CardVariant;
  scaleAnim: Animated.Value;
}

export function PlayerCardHero({
  player,
  variant,
  scaleAnim,
}: PlayerCardHeroProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const style = VARIANT_STYLES[variant];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 700,
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
    <View style={[styles.ovrWrap, { borderColor: style.border }]}>
      <View style={[styles.ovrGlow, { backgroundColor: style.badgeGlow }]} />
      <Text style={styles.ovrLabel}>OVR</Text>
      <Text style={[styles.ovrValue, { color: style.badge }]}>{player.ovr}</Text>
    </View>
  );

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <View style={[styles.outerGlow, { backgroundColor: style.glow }]} />
      <View style={[styles.card, { borderColor: style.border }]}>
        <View style={[styles.cardInner, { borderColor: style.borderInner }]} />
        <View style={[styles.cornerAccent, styles.cornerTL, { backgroundColor: style.cornerGlow }]} />
        <View style={[styles.cornerAccent, styles.cornerBR, { backgroundColor: style.cornerGlow }]} />
        <ImageBackground
          source={{ uri: player.image }}
          style={styles.image}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={["transparent", "rgba(2,6,23,0.15)", "rgba(2,6,23,0.85)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.35)", "transparent", "transparent", "rgba(0,0,0,0.2)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={style.gradient as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {Platform.OS === "web" ? (
            <View style={[styles.ovrPosition, styles.ovrGlassWeb]}>
              {OVRBadge}
            </View>
          ) : (
            <BlurView intensity={24} tint="dark" style={styles.ovrPosition}>
              {OVRBadge}
            </BlurView>
          )}
          <View style={styles.bottom}>
            <Text style={styles.number}>{player.number}</Text>
            <Text style={styles.name}>{player.name}</Text>
            <Text style={styles.meta}>
              {player.position}  •  {player.team}
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
    marginBottom: 20,
  },
  outerGlow: {
    position: "absolute",
    width: CARD_WIDTH + 40,
    height: CARD_HEIGHT + 40,
    borderRadius: 24,
    opacity: 0.32,
    top: -20,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 20,
    elevation: 14,
  },
  cardInner: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 1,
    pointerEvents: "none",
  },
  cornerAccent: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 6,
    opacity: 0.24,
    zIndex: 1,
    pointerEvents: "none",
  },
  cornerTL: {
    top: 8,
    left: 8,
  },
  cornerBR: {
    bottom: 8,
    right: 8,
  },
  image: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  imageStyle: {
    borderRadius: 19,
  },
  ovrPosition: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  ovrGlassWeb: {
    backgroundColor: "rgba(2,6,23,0.8)",
  },
  ovrWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  ovrGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    opacity: 0.4,
  },
  ovrLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  ovrValue: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  bottom: {
    paddingTop: 6,
  },
  number: {
    color: "rgba(255,255,255,0.96)",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  name: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: -2,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  meta: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
});
