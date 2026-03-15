import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, radius, spacing, shadows } from "@/theme/designSystem";

type Props = {
  children: React.ReactNode;
  style?: object;
  contentStyle?: object;
  padding?: number;
};

export function GlassCard({
  children,
  style,
  contentStyle,
  padding = spacing.screenPadding,
}: Props) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.content, { padding }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden",
    ...shadows.card,
  },
  content: {
    backgroundColor: "transparent",
  },
});
