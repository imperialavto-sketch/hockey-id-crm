import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography, radius, shadows } from "@/constants/theme";
import type { MockCoach } from "@/constants/mockCoaches";

interface CoachStatsRowProps {
  coach: MockCoach;
}

export function CoachStatsRow({ coach }: CoachStatsRowProps) {
  const stats = [
    { value: `${coach.experienceYears} лет`, label: "опыта" },
    { value: String(coach.sessionsCompleted ?? 0), label: "тренировок" },
    { value: `${coach.repeatBookingRate ?? 0}%`, label: "повторных" },
    { value: coach.rating.toFixed(1), label: "рейтинг" },
    { value: String(coach.reviewsCount), label: "отзывов" },
  ].filter((s) => s.value && s.value !== "0");

  return (
    <View style={styles.wrap}>
      {stats.map((s, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.value}>{s.value}</Text>
          <Text style={styles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sectionGap,
    padding: spacing.xl,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    ...shadows.level1,
  },
  item: {
    alignItems: "center",
  },
  value: {
    ...typography.cardTitle,
    fontSize: 18,
    color: colors.text,
    letterSpacing: -0.2,
  },
  label: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
