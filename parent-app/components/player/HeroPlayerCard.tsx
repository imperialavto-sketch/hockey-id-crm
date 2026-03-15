import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { colors, spacing, typography } from "@/constants/theme";

const EASE = Easing.out(Easing.cubic);

export interface HeroPlayerCardProps {
  name: string;
  team: string;
  number: number | string;
  position: string;
  photo?: ImageSourcePropType | { uri: string } | null;
  /** L1: name, position, team. L2: age, height, weight, shoots, number. L3: badges */
  age?: number | null;
  birthYear?: number | null;
  height?: number | null;
  weight?: number | null;
  shoots?: string | null;
  city?: string | null;
  /** Overall rating (1–99). Shown in badge if present */
  overall?: number | null;
  stats?: { games?: string; goals?: string; assists?: string; points?: string };
  badges?: string[];
  onPress?: () => void;
}

const POSITION_MAP: Record<string, string> = {
  Forward: "Нападающий",
  Defenseman: "Защитник",
  Goaltender: "Вратарь",
  Center: "Центр",
  Left: "Левое крыло",
  Right: "Правое крыло",
};

function translatePosition(pos: string): string {
  return POSITION_MAP[pos] ?? pos;
}

function getMonogram(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] ?? "") + (parts[1][0] ?? "");
  }
  return (name[0] ?? "").toUpperCase();
}

/** Subtle light sweep — runs rarely and softly */
function LightSweepOverlay() {
  const sweep = useSharedValue(0);

  useEffect(() => {
    const run = () => {
      sweep.value = 0;
      sweep.value = withDelay(
        8000,
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) })
      );
    };
    run();
    const id = setInterval(run, 20000);
    return () => clearInterval(id);
  }, [sweep]);

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sweep.value, [0, 0.15, 0.85, 1], [0, 0.12, 0.12, 0]),
    transform: [
      {
        translateX: interpolate(sweep.value, [0, 1], [-60, 400]),
      },
    ],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.sweepWrap]} pointerEvents="none">
      <Animated.View style={[styles.sweep, sweepStyle]}>
        <LinearGradient
          colors={[
            "transparent",
            "rgba(255,255,255,0.06)",
            "rgba(255,255,255,0.03)",
            "transparent",
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * FIFA / NHL Ultimate Team style hero card.
 * Premium sports product: photo, overall, name, position, team, stats, badges.
 */
export function HeroPlayerCard({
  name,
  team,
  number,
  position,
  photo,
  age,
  birthYear,
  height,
  weight,
  shoots,
  city,
  overall,
  stats,
  badges,
  onPress,
}: HeroPlayerCardProps) {
  const displayNumber =
    number == null || number === "" || number === "—"
      ? "—"
      : typeof number === "number"
        ? `#${number}`
        : String(number).startsWith("#")
          ? number
          : `#${number}`;

  const photoSource = photo && typeof photo === "object" && "uri" in photo ? photo : null;

  const metaParts: string[] = [];
  if (age != null && age > 0) metaParts.push(`${age} лет`);
  if (height != null && height > 0) metaParts.push(`${height} см`);
  if (weight != null && weight > 0) metaParts.push(`${weight} кг`);
  if (shoots) metaParts.push(shoots === "Left" ? "Левый" : shoots === "Right" ? "Правый" : shoots);
  const metaStr = metaParts.length ? metaParts.join(" • ") : undefined;

  const cardInner = (
    <>
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.03)",
          "transparent",
          "rgba(2,6,23,0.7)",
        ]}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.06)", "transparent"]}
        locations={[0, 0.18]}
        style={[StyleSheet.absoluteFill, styles.topShine]}
      />
      <LightSweepOverlay />

      {/* Photo — hero composition */}
      <Animated.View
        entering={FadeIn.duration(480).easing(EASE)}
        style={styles.photoSection}
      >
        {photoSource ? (
          <>
            <View style={styles.photoFrame}>
              <View style={styles.photoCrop}>
                <Image
                  source={photoSource}
                  style={styles.photo}
                  resizeMode="cover"
                />
              </View>
              <LinearGradient
                colors={[
                  "rgba(255,255,255,0.02)",
                  "transparent",
                  "transparent",
                  "rgba(2,6,23,0.92)",
                ]}
                locations={[0, 0.15, 0.45, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.photoInnerHighlight} />
            </View>
          </>
        ) : (
          <View style={styles.monogramWrap}>
            <Text style={styles.monogram} allowFontScaling={false}>
              {getMonogram(name)}
            </Text>
            <LinearGradient
              colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </View>
        )}
      </Animated.View>

      <View style={[styles.content, !photoSource && styles.contentNoPhoto]}>
        {/* Overall badge */}
        {overall != null && overall > 0 && (
          <Animated.View
            entering={FadeIn.duration(350).easing(EASE)}
            style={styles.ovrWrap}
          >
            <Text style={styles.ovrLabel}>OVR</Text>
            <Text style={styles.ovrValue} allowFontScaling={false}>
              {Math.min(99, Math.max(1, overall))}
            </Text>
          </Animated.View>
        )}

        <Animated.Text
          entering={FadeIn.duration(400).easing(EASE)}
          style={styles.heroNumber}
          allowFontScaling={false}
        >
          {displayNumber}
        </Animated.Text>

        {/* L1: name, position, team */}
        <View style={styles.infoBlock}>
          <Animated.Text
            entering={FadeInUp.delay(60).duration(420).easing(EASE)}
            style={styles.playerName}
          >
            {name}
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(120).duration(400).easing(EASE)}
            style={styles.metaRow}
          >
            {translatePosition(position)}
            {team ? ` • ${team}` : ""}
          </Animated.Text>
        </View>

        {/* L2: age, height, weight, shoots */}
        {metaStr && (
          <Animated.Text
            entering={FadeInUp.delay(180).duration(380).easing(EASE)}
            style={styles.metaL2}
          >
            {metaStr}
          </Animated.Text>
        )}

        {/* L3: city */}
        {city && (
          <Animated.Text
            entering={FadeInUp.delay(220).duration(360).easing(EASE)}
            style={styles.metaL3}
          >
            {city}
          </Animated.Text>
        )}

        {/* L4: badges */}
        {badges && badges.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(260).duration(350).easing(EASE)}
            style={styles.badgesRow}
          >
            {badges.slice(0, 4).map((b, i) => (
              <View key={i} style={styles.badge}>
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Stats row */}
        {stats && (stats.games || stats.goals || stats.assists || stats.points) ? (
          <Animated.View
            entering={FadeInUp.delay(stats ? 300 : 200).duration(400).easing(EASE)}
            style={styles.statsRow}
          >
            {stats.games != null && (
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{stats.games}</Text>
                <Text style={styles.statLabel}>Игры</Text>
              </View>
            )}
            {stats.goals != null && (
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{stats.goals}</Text>
                <Text style={styles.statLabel}>Голы</Text>
              </View>
            )}
            {stats.assists != null && (
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{stats.assists}</Text>
                <Text style={styles.statLabel}>Передачи</Text>
              </View>
            )}
            {stats.points != null && (
              <View style={[styles.statBlock, styles.statBlockAccent]}>
                <Text style={[styles.statValue, styles.statValueAccent]}>{stats.points}</Text>
                <Text style={styles.statLabel}>Очки</Text>
              </View>
            )}
          </Animated.View>
        ) : null}
      </View>
    </>
  );

  const cardWrapper = (
    <Animated.View
      entering={FadeInUp.duration(620).easing(EASE)}
      style={[styles.wrap, onPress && styles.wrapPressable]}
    >
      {Platform.OS === "web" ? (
        <View style={[styles.card, styles.cardWeb]}>{cardInner}</View>
      ) : (
        <BlurView intensity={14} tint="dark" style={styles.card}>
          {cardInner}
        </BlurView>
      )}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => {}}
        onPressOut={() => {}}
        style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.98 }]}
      >
        {cardWrapper}
      </Pressable>
    );
  }

  return cardWrapper;
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xxl,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  wrapPressable: {},
  pressable: {
    marginBottom: spacing.xxl,
  },
  card: {
    position: "relative",
    overflow: "hidden",
  },
  cardWeb: {
    backgroundColor: "rgba(12,22,42,0.82)",
  },
  topShine: {
    pointerEvents: "none",
  },
  sweepWrap: {
    pointerEvents: "none",
  },
  sweep: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 120,
  },
  photoSection: {
    height: 220,
    position: "relative",
    overflow: "hidden",
  },
  photoFrame: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25,35,55,0.9)",
    overflow: "hidden",
  },
  photoCrop: {
    ...StyleSheet.absoluteFillObject,
    top: -12,
    height: "110%",
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(30,41,59,0.8)",
  },
  photoInnerHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
    backgroundColor: "transparent",
  },
  monogramWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,45,70,0.6)",
    position: "relative",
  },
  monogram: {
    fontSize: 56,
    fontWeight: "700",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: -2,
  },
  content: {
    padding: spacing.xl,
  },
  contentNoPhoto: {
    paddingTop: spacing.xxl,
  },
  ovrWrap: {
    position: "absolute",
    top: spacing.md,
    right: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  ovrLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.5,
  },
  ovrValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroNumber: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.lg,
    fontSize: 130,
    fontWeight: "900",
    color: "rgba(255,255,255,0.05)",
    letterSpacing: -4,
  },
  infoBlock: {
    marginBottom: spacing.sm,
  },
  playerName: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  metaRow: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  metaL2: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  metaL3: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
    marginBottom: spacing.md,
    opacity: 0.9,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statBlock: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  statBlockAccent: {
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statValueAccent: {
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
