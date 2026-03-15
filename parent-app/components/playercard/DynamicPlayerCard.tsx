import React, { useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { colors } from "@/constants/theme";
import type {
  DynamicCardVariant,
  DynamicPlayerData,
  PlayerAttributes,
} from "@/constants/mockDynamicCard";
import { ATTRIBUTE_LABELS } from "@/constants/mockDynamicCard";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width - 40, 348);
const CARD_HEIGHT = CARD_WIDTH * 1.48;

const ATTR_KEYS: (keyof PlayerAttributes)[] = [
  "skating",
  "shot",
  "passing",
  "hockeyIQ",
  "discipline",
  "physical",
];

const VARIANT_STYLES: Record<
  DynamicCardVariant,
  {
    gradient: readonly string[];
    glow: string;
    border: string;
    badge: string;
    cornerGlow: string;
    shadowColor: string;
    innerFrame: string;
    topAccent: string;
    statBarStart: string;
    statBarEnd: string;
    glowIntensity: number;
  }
> = {
  season: {
    gradient: [
      "rgba(37,99,235,0.4)",
      "rgba(59,130,246,0.18)",
      "transparent",
      "rgba(239,68,68,0.28)",
    ],
    glow: "rgba(37,99,235,0.55)",
    border: "rgba(96,165,250,0.7)",
    badge: "#60A5FA",
    cornerGlow: "rgba(37,99,235,0.5)",
    shadowColor: "rgba(37,99,235,0.55)",
    innerFrame: "rgba(255,255,255,0.06)",
    topAccent: "rgba(96,165,250,0.8)",
    statBarStart: "#3B82F6",
    statBarEnd: "#EF4444",
    glowIntensity: 0.5,
  },
  elite: {
    gradient: [
      "rgba(167,139,250,0.45)",
      "rgba(99,102,241,0.25)",
      "transparent",
      "rgba(236,72,153,0.2)",
    ],
    glow: "rgba(139,92,246,0.65)",
    border: "rgba(192,132,252,0.8)",
    badge: "#C084FC",
    cornerGlow: "rgba(167,139,250,0.6)",
    shadowColor: "rgba(139,92,246,0.6)",
    innerFrame: "rgba(192,132,252,0.12)",
    topAccent: "rgba(192,132,252,0.9)",
    statBarStart: "#A78BFA",
    statBarEnd: "#EC4899",
    glowIntensity: 0.58,
  },
  tournament: {
    gradient: [
      "rgba(253,224,71,0.35)",
      "rgba(251,191,36,0.25)",
      "transparent",
      "rgba(239,68,68,0.3)",
    ],
    glow: "rgba(251,191,36,0.6)",
    border: "rgba(253,224,71,0.85)",
    badge: "#FDE047",
    cornerGlow: "rgba(251,191,36,0.6)",
    shadowColor: "rgba(251,191,36,0.55)",
    innerFrame: "rgba(253,224,71,0.1)",
    topAccent: "rgba(253,224,71,0.95)",
    statBarStart: "#FBBF24",
    statBarEnd: "#EF4444",
    glowIntensity: 0.55,
  },
  future_star: {
    gradient: [
      "rgba(34,211,238,0.4)",
      colors.accentSoft,
      "transparent",
      "rgba(139,92,246,0.22)",
    ],
    glow: colors.accent,
    border: "rgba(34,211,238,0.85)",
    badge: "#22D3EE",
    cornerGlow: colors.accent,
    shadowColor: colors.accent,
    innerFrame: "rgba(34,211,238,0.1)",
    topAccent: "rgba(34,211,238,0.95)",
    statBarStart: colors.accent,
    statBarEnd: "#A78BFA",
    glowIntensity: 0.62,
  },
};

interface DynamicPlayerCardProps {
  player: DynamicPlayerData;
  variant: DynamicCardVariant;
  scaleAnim: SharedValue<number>;
}

function StatMiniBar({
  label,
  value,
  startColor,
  endColor,
}: {
  label: string;
  value: number;
  startColor: string;
  endColor: string;
}) {
  const pct = Math.min(100, (value / 99) * 100);
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}>
        <LinearGradient
          colors={[startColor, endColor]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.statFill, { width: `${pct}%` }]}
        />
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function DynamicPlayerCard({
  player,
  variant,
  scaleAnim,
}: DynamicPlayerCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  const style = VARIANT_STYLES[variant];

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    translateY.value = withSpring(0, {
      damping: 18,
      stiffness: 120,
    });
  }, []);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scaleAnim.value },
    ],
  }));

  const OVRBadge = (
    <View style={[styles.ovrWrap, { borderColor: style.badge }]}>
      <LinearGradient
        colors={[`${style.badge}50`, `${style.badge}18`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.ovrLabel}>OVR</Text>
      <Text style={[styles.ovrValue, { color: style.badge }]}>{player.ovr}</Text>
    </View>
  );

  return (
    <Animated.View style={[styles.wrap, animatedCardStyle]}>
      <View
        style={[
          styles.glowOuter,
          {
            backgroundColor: style.glow,
            opacity: style.glowIntensity,
          },
        ]}
      />
      <View
        style={[
          styles.card,
          {
            borderColor: style.border,
            shadowColor: style.shadowColor,
          },
        ]}
      >
        <View
          style={[
            styles.topAccentBar,
            { backgroundColor: style.topAccent },
          ]}
        />
        <View
          style={[
            styles.innerFrame,
            { borderColor: style.innerFrame },
          ]}
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.12)", "transparent", "rgba(0,0,0,0.15)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.borderGlow}
        />
        <View
          style={[
            styles.cornerAccent,
            styles.cornerTL,
            { backgroundColor: style.cornerGlow },
          ]}
        />
        <View
          style={[
            styles.cornerAccent,
            styles.cornerBR,
            { backgroundColor: style.cornerGlow },
          ]}
        />
        <ImageBackground
          source={{ uri: player.image }}
          style={styles.image}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={["transparent", "rgba(2,6,23,0.15)", "rgba(2,6,23,0.88)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={
              style.gradient as readonly [string, string, ...string[]]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {Platform.OS === "web" ? (
            <View style={[styles.ovrPosition, styles.ovrWeb]}>{OVRBadge}</View>
          ) : (
            <BlurView intensity={32} tint="dark" style={styles.ovrPosition}>
              {OVRBadge}
            </BlurView>
          )}
          <View style={styles.bottom}>
            <Text style={styles.number}>{player.number}</Text>
            <Text style={styles.name}>{player.name}</Text>
            <Text style={styles.meta}>
              {player.team} • {player.position}
            </Text>
            <View style={styles.attrs}>
              {ATTR_KEYS.map((key) => (
                <StatMiniBar
                  key={key}
                  label={ATTRIBUTE_LABELS[key]}
                  value={player.attributes[key]}
                  startColor={style.statBarStart}
                  endColor={style.statBarEnd}
                />
              ))}
            </View>
          </View>
        </ImageBackground>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: 28,
  },
  glowOuter: {
    position: "absolute",
    width: CARD_WIDTH + 80,
    height: CARD_HEIGHT + 80,
    borderRadius: 44,
    top: -40,
  },
  topAccentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 2,
  },
  innerFrame: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 22,
    borderWidth: 1,
    zIndex: 1,
    pointerEvents: "none",
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.48,
    shadowRadius: 36,
    elevation: 20,
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    pointerEvents: "none",
  },
  cornerAccent: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 16,
    opacity: 0.45,
    zIndex: 1,
    pointerEvents: "none",
  },
  cornerTL: { top: 12, left: 12 },
  cornerBR: { bottom: 12, right: 12 },
  image: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 22,
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
    backgroundColor: "rgba(2,6,23,0.88)",
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
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  bottom: {
    paddingTop: 8,
  },
  number: {
    color: "rgba(255,255,255,0.98)",
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 56,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  name: {
    color: "#F8FAFC",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: -4,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  meta: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 8,
    marginBottom: 14,
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  attrs: {
    gap: 10,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    width: 36,
    letterSpacing: 0.4,
  },
  statTrack: {
    flex: 1,
    height: 7,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statFill: {
    height: "100%",
    borderRadius: 3,
  },
  statValue: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "900",
    width: 20,
    textAlign: "right",
  },
});
