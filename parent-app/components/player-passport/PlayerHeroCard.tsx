import { View, Text, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { Easing } from "react-native-reanimated";

const EASE = Easing.out(Easing.cubic);

interface PlayerHeroCardProps {
  name: string;
  team: string;
  number: number | string;
  position: string;
  birthYear?: number;
  teamChip?: boolean;
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

export function PlayerHeroCard({
  name,
  team,
  number,
  position,
  birthYear,
}: PlayerHeroCardProps) {
  const displayNumber =
    number == null || number === "" || number === "—"
      ? "—"
      : typeof number === "number"
        ? `#${number}`
        : String(number).startsWith("#")
          ? number
          : `#${number}`;

  const cardContent = (
    <View style={styles.content}>
      <Animated.Text
        entering={FadeIn.duration(400).easing(EASE)}
        style={styles.heroNumber}
        allowFontScaling={false}
      >
        {displayNumber}
      </Animated.Text>
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.04)",
          "rgba(148,163,184,0.02)",
          "rgba(6,18,42,0.6)",
        ]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={styles.infoBlock}>
        <Animated.Text
          entering={FadeInUp.delay(80).duration(480).easing(EASE)}
          style={styles.playerName}
        >
          {name}
        </Animated.Text>
        <Animated.Text
          entering={FadeInUp.delay(140).duration(450).easing(EASE)}
          style={styles.metaRow}
        >
          {translatePosition(position)}
          {team ? ` • ${team}` : ""}
        </Animated.Text>
        {birthYear != null && (
          <Animated.Text
            entering={FadeInUp.delay(200).duration(420).easing(EASE)}
            style={styles.birthYear}
          >
            {birthYear} г.р.
          </Animated.Text>
        )}
        <Animated.View
          entering={FadeInUp.delay(260).duration(420).easing(EASE)}
          style={styles.statusBadge}
        >
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Активный игрок</Text>
        </Animated.View>
      </View>
    </View>
  );

  return (
    <Animated.View
      entering={FadeInUp.duration(560).easing(EASE)}
      style={styles.wrap}
    >
      {Platform.OS === "web" ? (
        <View style={[styles.glassCard, styles.glassCardWeb]}>
          {cardContent}
        </View>
      ) : (
        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          {cardContent}
        </BlurView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  glassCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  glassCardWeb: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
  },
  content: {
    position: "relative",
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 22,
  },
  heroNumber: {
    position: "absolute",
    top: -8,
    right: 4,
    fontSize: 160,
    fontWeight: "900",
    color: "rgba(255,255,255,0.08)",
    letterSpacing: -6,
  },
  infoBlock: {
    position: "relative",
    zIndex: 1,
    gap: 4,
  },
  playerName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F5F7FB",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  metaRow: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 2,
  },
  birthYear: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#22C55E",
  },
});
