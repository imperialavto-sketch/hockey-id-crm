import React from "react";
import { colors } from "@/constants/theme";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, TrendingUp, Star } from "lucide-react-native";
import { GlassCard } from "@/components/shared/GlassCard";

interface TimelineSummaryCardProps {
  totalMilestones: number;
  ovrGrowth: string;
  skillHighlights: string[];
  onViewPassport: () => void;
}

export function TimelineSummaryCard({
  totalMilestones,
  ovrGrowth,
  skillHighlights,
  onViewPassport,
}: TimelineSummaryCardProps) {
  return (
    <GlassCard style={styles.card} variant="subtle">
      <View style={styles.header}>
        <Star size={18} color="#FBBF24" strokeWidth={2.5} />
        <Text style={styles.title}>Season in Review</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalMilestones}</Text>
          <Text style={styles.statLabel}>Milestones</Text>
        </View>
        <View style={[styles.stat, styles.statOvr]}>
          <View style={styles.ovrRow}>
            <TrendingUp size={18} color="#22C55E" strokeWidth={2.5} />
            <Text style={styles.ovrValue}>{ovrGrowth}</Text>
          </View>
          <Text style={styles.statLabel}>OVR Growth</Text>
        </View>
      </View>
      <View style={styles.highlights}>
        {skillHighlights.map((h, i) => (
          <View key={i} style={styles.highlightChip}>
            <Text style={styles.highlightText}>{h}</Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={onViewPassport}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <LinearGradient
          colors={["#2563EB", "#3B82F6", "#6366F1"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>View full player passport</Text>
          <ChevronRight size={20} color="#fff" strokeWidth={2.5} />
        </LinearGradient>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    marginBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.35,
  },
  stats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  statOvr: {
    borderColor: "rgba(34,197,94,0.2)",
    backgroundColor: "rgba(34,197,94,0.06)",
  },
  statValue: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statLabel: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ovrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ovrValue: {
    color: "#22C55E",
    fontSize: 24,
    fontWeight: "900",
  },
  highlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  highlightChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlightText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.15,
  },
  cta: {
    borderRadius: 14,
    overflow: "hidden",
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  ctaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.05,
  },
});
