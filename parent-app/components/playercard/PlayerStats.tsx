import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { PlayerCardData, PlayerAttributes } from "@/constants/mockPlayer";
import { ATTRIBUTE_LABELS } from "@/constants/mockPlayer";
import { GlassCard } from "@/components/shared/GlassCard";
import { colors } from "@/constants/theme";

const ATTR_KEYS: (keyof PlayerAttributes)[] = [
  "skating",
  "shot",
  "passing",
  "hockeyIQ",
  "discipline",
  "physical",
];

interface PlayerStatsProps {
  player: PlayerCardData;
}

function StatBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, (value / 99) * 100);
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <LinearGradient
          colors={[colors.accent, "#2563EB", "#7C3AED", colors.error]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.barFill, { width: `${pct}%` }]}
        />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

export function PlayerStats({ player }: PlayerStatsProps) {
  return (
    <GlassCard style={styles.card} variant="subtle">
      <View style={styles.header}>
        <Text style={styles.title}>Attributes</Text>
        <View style={styles.ovrBadge}>
          <Text style={styles.ovrText}>OVR {player.ovr}</Text>
        </View>
      </View>
      <View style={styles.attrs}>
        {ATTR_KEYS.map((key) => (
          <StatBar
            key={key}
            label={ATTRIBUTE_LABELS[key]}
            value={player.attributes[key]}
          />
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 24,
    borderRadius: 28,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  ovrBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.accentSoft,
  },
  ovrText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "900",
  },
  attrs: {
    gap: 16,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  barLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "800",
    width: 40,
    letterSpacing: 0.5,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  barFill: {
    height: "100%",
    borderRadius: 5,
  },
  barValue: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "900",
    width: 24,
    textAlign: "right",
  },
});
