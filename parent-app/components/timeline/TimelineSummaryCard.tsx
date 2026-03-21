import React from "react";
import { colors, spacing, radius, typography } from "@/constants/theme";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
        <Ionicons name="star" size={18} color={colors.warning} />
        <Text style={styles.title}>Season in Review</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalMilestones}</Text>
          <Text style={styles.statLabel}>Milestones</Text>
        </View>
        <View style={[styles.stat, styles.statOvr]}>
          <View style={styles.ovrRow}>
            <Ionicons name="trending-up" size={18} color={colors.success} />
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
          colors={[colors.accent, colors.accentSecondary]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>View full player passport</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.onAccent} />
        </LinearGradient>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
    marginBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.35,
  },
  stats: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  stat: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  statOvr: {
    borderColor: "rgba(57,217,138,0.25)",
    backgroundColor: colors.successSoft,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.text,
  },
  statLabel: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontWeight: "600",
  },
  ovrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ovrValue: {
    color: colors.success,
    fontSize: 24,
    fontWeight: "800",
  },
  highlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  highlightChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  highlightText: {
    ...typography.captionSmall,
    color: colors.accent,
    fontWeight: "700",
    letterSpacing: 0.15,
  },
  cta: {
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  ctaText: {
    ...typography.bodySmall,
    fontSize: 15,
    fontWeight: "700",
    color: colors.onAccent,
  },
});
