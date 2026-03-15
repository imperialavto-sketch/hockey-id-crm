import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors, spacing } from "@/constants/theme";

interface PassportInfoCardProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Official passport info block — structured, clean, document-style.
 */
export function PassportInfoCard({ title, children, style }: PassportInfoCardProps) {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(18,30,52,0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: spacing.sectionGap,
  },
  titleRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.8,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
});
