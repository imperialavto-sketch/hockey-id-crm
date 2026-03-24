import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SectionCard } from "@/components/player-passport";
import { colors, radii, spacing } from "@/constants/theme";
import type { MockCoach } from "@/constants/mockCoaches";

interface CoachSpecializationTagsProps {
  coach: MockCoach;
}

export function CoachSpecializationTags({ coach }: CoachSpecializationTagsProps) {
  const specs = [
    coach.specialization,
    ...(coach.specializations ?? []),
  ].filter(Boolean);
  const unique = [...new Set(specs)];

  if (unique.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionCard title="Специализация" style={styles.card}>
        <View style={styles.row}>
          {unique.map((s, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{s}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sectionGap,
  },
  card: {
    marginBottom: 0,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
});
