import React from "react";
import { colors, spacing, typography, radius, shadows } from "@/constants/theme";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MockCoach } from "@/constants/mockCoaches";

interface CoachTrustBadgeProps {
  label: string;
  icon: React.ReactNode;
}

function Badge({ label, icon }: CoachTrustBadgeProps) {
  return (
    <View style={styles.badge}>
      {icon}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

interface CoachTrustSectionProps {
  coach: MockCoach;
}

export function CoachTrustSection({ coach }: CoachTrustSectionProps) {
  const items: CoachTrustBadgeProps[] = [];
  if (coach.verified) {
    items.push({
      label: "Verified Coach",
      icon: <Ionicons name="checkmark-circle" size={18} color={colors.accent} />,
    });
  }
  if (coach.documentsChecked) {
    items.push({
      label: "Документы проверены",
      icon: <Ionicons name="document-text" size={18} color={colors.accent} />,
    });
  }
  if (coach.experienceYears && coach.experienceYears >= 5) {
    items.push({
      label: "Опыт подтверждён",
      icon: <Ionicons name="ribbon" size={18} color={colors.accent} />,
    });
  }
  if (coach.sessionsCompleted && coach.sessionsCompleted >= 300) {
    items.push({
      label: "Работал с игроками топ-уровня",
      icon: <Ionicons name="trophy" size={18} color={colors.accent} />,
    });
  }
  if (coach.responseTime) {
    items.push({
      label: `Ответ ${coach.responseTime}`,
      icon: <Ionicons name="time" size={18} color={colors.accent} />,
    });
  }
  if (coach.repeatBookingRate && coach.repeatBookingRate >= 70) {
    items.push({
      label: `${coach.repeatBookingRate}% повторных`,
      icon: <Ionicons name="refresh" size={18} color={colors.accent} />,
    });
  }
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Подтверждённый профиль</Text>
      <View style={styles.grid}>
        {items.map((item, i) => (
          <Badge key={i} label={item.label} icon={item.icon} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sectionGap,
    padding: spacing.xl,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    ...shadows.level1,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.sm,
  },
  label: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
