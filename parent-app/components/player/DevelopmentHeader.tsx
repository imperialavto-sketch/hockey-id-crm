import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "@/constants/theme";

interface DevelopmentHeaderProps {
  playerName: string;
  subtitle?: string;
}

export function DevelopmentHeader({
  playerName,
  subtitle = "Путь развития игрока",
}: DevelopmentHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.name}>{playerName}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xxl,
  },
  name: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
