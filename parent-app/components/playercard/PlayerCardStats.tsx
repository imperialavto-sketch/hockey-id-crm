import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { PlayerCardData, PlayerAttributes } from "@/constants/mockPlayer";
import { ATTRIBUTE_LABELS } from "@/constants/mockPlayer";
import { GlassCard } from "@/components/shared/GlassCard";
import { colors } from "@/constants/theme";

interface PlayerCardStatsProps {
  player: PlayerCardData;
}

const ATTR_KEYS: (keyof PlayerAttributes)[] = [
  "skating",
  "shot",
  "passing",
  "hockeyIQ",
  "discipline",
  "physical",
];

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

export function PlayerCardStats({ player }: PlayerCardStatsProps) {
  return (
    <GlassCard style={styles.card} variant="subtle">
      <View style={styles.ovrRow}>
        <Text style={styles.ovrLabel}>Overall Rating</Text>
        <LinearGradient
          colors={["rgba(37,99,235,0.35)", "rgba(239,68,68,0.2)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ovrValueWrap}
        >
          <Text style={styles.ovrValue}>{player.ovr}</Text>
        </LinearGradient>
      </View>
      <View style={styles.divider} />
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
    marginBottom: 20,
  },
  ovrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ovrLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ovrValueWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  ovrValue: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 16,
  },
  attrs: {
    gap: 12,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  barLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    width: 36,
    letterSpacing: 0.4,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  barFill: {
    height: "100%",
    borderRadius: 5,
  },
  barValue: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "900",
    width: 22,
    textAlign: "right",
  },
});
