import React from "react";
import { View, Text, Image, StyleSheet, ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const POSITION_MAP: Record<string, string> = {
  Forward: "Нападающий",
  Defenseman: "Защитник",
  Goaltender: "Вратарь",
  Center: "Центр",
};

function translatePosition(pos: string): string {
  return POSITION_MAP[pos] ?? pos;
}

function getMonogram(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] ?? "") + (parts[1][0] ?? "");
  return (name[0] ?? "").toUpperCase();
}

export interface SharePlayerCardProps {
  name: string;
  position?: string | null;
  team?: string | null;
  number?: number | string | null;
  age?: number | null;
  city?: string | null;
  photo?: ImageSourcePropType | { uri: string } | null;
  stats?: {
    games?: number | string;
    goals?: number | string;
    assists?: number | string;
    points?: number | string;
  } | null;
  /** Size in px. 360 for preview, 1080 for capture. */
  size?: number;
}

/**
 * Premium share card — 360 for preview, 1080 for capture (social).
 */
export function SharePlayerCard({
  name,
  position,
  team,
  number,
  age,
  city,
  photo,
  stats,
  size = 360,
}: SharePlayerCardProps) {
  const photoSource = photo && typeof photo === "object" && "uri" in photo ? photo : null;
  const metaParts: string[] = [];
  if (position) metaParts.push(translatePosition(position));
  if (team) metaParts.push(team);
  if (number != null) metaParts.push(typeof number === "number" ? `#${number}` : String(number));
  const metaStr = metaParts.join(" · ");

  const statItems: { label: string; value: string }[] = [];
  if (stats?.games != null) statItems.push({ label: "Игры", value: String(stats.games) });
  if (stats?.goals != null) statItems.push({ label: "Голы", value: String(stats.goals) });
  if (stats?.assists != null) statItems.push({ label: "Пас", value: String(stats.assists) });
  if (stats?.points != null) statItems.push({ label: "Очки", value: String(stats.points) });

  const scale = size / 360;
  const s = (n: number) => Math.round(n * scale);

  return (
    <View style={[styles.card, { width: size, height: size, borderRadius: s(24), borderWidth: 1 }]} collapsable={false}>
      <LinearGradient
        colors={["#05101f", "#071428", "#030a14"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(56,189,248,0.08)", "transparent"]}
        locations={[0, 0.5]}
        style={[StyleSheet.absoluteFill, styles.glow]}
      />

      {/* Photo */}
      <View style={[styles.photoSection, { height: s(140) }]}>
        {photoSource ? (
          <Image source={photoSource} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.monogramWrap}>
            <Text style={[styles.monogram, { fontSize: s(48) }]}>{getMonogram(name)}</Text>
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(2,6,23,0.9)"]}
          locations={[0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Center: name, meta */}
      <View style={[styles.center, { paddingHorizontal: s(24), paddingTop: s(20), paddingBottom: s(16) }]}>
        <Text style={[styles.name, { fontSize: s(26), marginBottom: s(4) }]} numberOfLines={2}>
          {name}
        </Text>
        {metaStr ? (
          <Text style={[styles.meta, { fontSize: s(14), marginBottom: s(2) }]} numberOfLines={1}>
            {metaStr}
          </Text>
        ) : null}
        {(age || city) && (
          <Text style={[styles.secondary, { fontSize: s(13) }]} numberOfLines={1}>
            {[age ? `${age} лет` : null, city].filter(Boolean).join(" · ")}
          </Text>
        )}
      </View>

      {/* Stats */}
      {statItems.length > 0 && (
        <View style={[styles.statsRow, { gap: s(24), paddingHorizontal: s(24), paddingVertical: s(12) }]}>
          {statItems.map((item) => (
            <View key={item.label} style={styles.statBlock}>
              <Text style={[styles.statValue, { fontSize: s(22), marginBottom: s(2) }]}>{item.value}</Text>
              <Text style={[styles.statLabel, { fontSize: s(11) }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Bottom: Hockey ID branding */}
      <View style={[styles.branding, { bottom: s(16) }]}>
        <Text style={[styles.brandLogo, { fontSize: s(16) }]}>Hockey ID</Text>
        <Text style={[styles.brandTag, { fontSize: s(10), marginTop: s(2) }]}>Player Passport</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderColor: "rgba(255,255,255,0.1)",
  },
  glow: {
    pointerEvents: "none",
  },
  photoSection: {
    height: 140,
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(25,40,65,0.9)",
  },
  monogramWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(25,40,65,0.8)",
  },
  monogram: {
    fontSize: 48,
    fontWeight: "700",
    color: "rgba(255,255,255,0.25)",
  },
  center: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  name: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F5F7FF",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(220,230,255,0.85)",
    marginBottom: 2,
  },
  secondary: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(220,230,255,0.55)",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  statBlock: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F5F7FF",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(220,230,255,0.5)",
  },
  branding: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  brandLogo: {
    fontSize: 16,
    fontWeight: "800",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 1,
  },
  brandTag: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
