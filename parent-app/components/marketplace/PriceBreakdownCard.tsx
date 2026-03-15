import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography, spacing } from "@/constants/theme";
import type { PriceBreakdown } from "@/types/booking";

interface PriceBreakdownCardProps {
  breakdown: PriceBreakdown;
}

export function PriceBreakdownCard({ breakdown }: PriceBreakdownCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Тренировка</Text>
        <Text style={styles.value}>{breakdown.coachAmount.toLocaleString("ru")} ₽</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Сервисный сбор</Text>
        <Text style={styles.value}>{breakdown.serviceFee.toLocaleString("ru")} ₽</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Комиссия Hockey ID</Text>
        <Text style={styles.value}>{breakdown.platformFee.toLocaleString("ru")} ₽</Text>
      </View>
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>Итого</Text>
        <Text style={styles.totalValue}>{breakdown.totalAmount.toLocaleString("ru")} ₽</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: 14,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  value: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.text,
  },
  totalLabel: {
    ...typography.cardTitle,
    color: colors.text,
  },
  totalValue: {
    ...typography.h2,
    color: colors.accent,
  },
});
