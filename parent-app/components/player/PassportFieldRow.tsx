import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "@/constants/theme";

interface PassportFieldRowProps {
  label: string;
  value: string | number | null | undefined;
  /** Render value below label on small screens */
  stack?: boolean;
  /** Last row in group — no bottom border */
  last?: boolean;
}

/**
 * Passport field row — label left, value right. Clean alignment.
 */
export function PassportFieldRow({ label, value, stack, last }: PassportFieldRowProps) {
  const displayValue = value != null && value !== "" ? String(value) : null;
  if (displayValue == null) return null;

  return (
    <View style={[styles.row, stack && styles.rowStack, last && styles.rowLast]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{displayValue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  rowStack: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
    marginRight: spacing.md,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "right",
    flex: 1,
  },
});
