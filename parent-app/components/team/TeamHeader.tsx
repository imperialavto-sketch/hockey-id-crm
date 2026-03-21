import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

interface TeamHeaderProps {
  teamName: string;
  subtitle?: string;
}

export function TeamHeader({ teamName, subtitle = "Командная лента" }: TeamHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.teamName}>{teamName}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  teamName: {
    ...typography.h1,
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
