import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors, rowStyles, typography } from "@/constants/theme";

type Props = {
  label: string;
  value?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Unified form row: label + value or right element.
 * Use for settings, about, simple key-value displays.
 */
export function FormRow({ label, value, right, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{label}</Text>
      {right ?? (value ? <Text style={styles.value}>{value}</Text> : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: rowStyles.minHeight,
    paddingVertical: rowStyles.paddingVertical,
    paddingHorizontal: rowStyles.paddingHorizontal,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    fontWeight: rowStyles.titleWeight,
    color: colors.textPrimary,
  },
});
