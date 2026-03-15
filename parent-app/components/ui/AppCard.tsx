import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { colors, spacing, shadows, cardEmphasized } from "@/constants/theme";

type Level = "standard" | "emphasized";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Override padding */
  padding?: number;
  /** Surface level: standard (Level 1) or emphasized (Level 2 / hero) */
  level?: Level;
};

/**
 * Unified card: borderRadius 20, padding 16, marginBottom 16.
 * level="standard" — secondary blocks
 * level="emphasized" — hero, primary blocks
 */
export function AppCard({
  children,
  style,
  padding = spacing.lg,
  level = "standard",
}: Props) {
  const cardStyle =
    level === "emphasized"
      ? [styles.card, styles.cardEmphasized, { padding }]
      : [styles.card, { padding }];
  return <View style={[...cardStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    marginBottom: spacing.lg,
    overflow: "hidden",
    ...shadows.level1,
  },
  cardEmphasized: {
    backgroundColor: cardEmphasized.backgroundColor,
    borderColor: cardEmphasized.borderColor,
    ...shadows.level2,
  },
});
