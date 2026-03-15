import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SectionCard } from "@/components/player-passport";
import { colors, spacing, typography } from "@/constants/theme";
import type { MockCoach } from "@/constants/mockCoaches";

interface CoachCredentialsCardProps {
  coach: MockCoach;
}

export function CoachCredentialsCard({ coach }: CoachCredentialsCardProps) {
  return (
    <View style={styles.wrap}>
      <SectionCard title="О тренере" style={styles.card}>
        <Text style={styles.bio}>{coach.bio}</Text>
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xxl,
  },
  card: {
    marginBottom: 0,
  },
  bio: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
