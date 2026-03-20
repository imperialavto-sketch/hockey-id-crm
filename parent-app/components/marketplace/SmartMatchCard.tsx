import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, aiMatchBadge, spacing, typography } from "@/constants/theme";
import type { MatchResult } from "@/lib/coach-matching";

interface SmartMatchCardProps {
  match: MatchResult;
  /** When null/undefined, use neutral text without player name */
  playerName?: string | null;
}

export function SmartMatchCard({ match, playerName }: SmartMatchCardProps) {
  const titleText = playerName
    ? `Почему этот тренер подходит ${playerName}`
    : "Почему этот тренер может подойти вашему игроку";

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={22} color={colors.accent} />
        <Text style={styles.title}>{titleText}</Text>
      </View>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>Совпадение</Text>
        <Text style={styles.scoreValue}>{match.matchScore}%</Text>
      </View>
      <View style={styles.reasons}>
        {match.matchReasons.map((r, i) => (
          <View key={i} style={styles.reason}>
            <View style={styles.bullet} />
            <Text style={styles.reasonText}>{r}</Text>
          </View>
        ))}
      </View>
      {match.recommendedFor.length > 0 && (
        <View style={styles.tags}>
          {match.recommendedFor.map((t, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xxl,
    padding: spacing.xl,
    backgroundColor: aiMatchBadge.backgroundColor,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: aiMatchBadge.borderColor,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.cardTitle,
    color: colors.text,
    flex: 1,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  scoreLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scoreValue: {
    ...typography.h2,
    color: aiMatchBadge.textColor,
  },
  reasons: {
    gap: spacing.sm,
  },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  reasonText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  tag: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
});
