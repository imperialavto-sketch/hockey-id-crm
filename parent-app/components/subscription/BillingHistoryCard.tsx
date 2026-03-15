import React from "react";
import { colors } from "@/constants/theme";
import { View, Text, StyleSheet } from "react-native";
import type { BillingRecord } from "@/types/subscription";

const STATUS_LABELS: Record<string, string> = {
  paid: "Оплачено",
  pending: "В обработке",
  failed: "Ошибка",
  refunded: "Возврат",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface BillingHistoryCardProps {
  record: BillingRecord;
}

export function BillingHistoryCard({ record }: BillingHistoryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.product}>{record.productName}</Text>
        <Text style={styles.amount}>
          {record.amount.toLocaleString("ru")} ₽
        </Text>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.date}>{formatDate(record.date)}</Text>
        <Text
          style={[
            styles.status,
            record.status === "paid" && styles.statusPaid,
          ]}
        >
          {STATUS_LABELS[record.status] ?? record.status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  product: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent,
  },
  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  date: {
    fontSize: 13,
    color: "#64748B",
  },
  status: {
    fontSize: 13,
    color: "#94A3B8",
  },
  statusPaid: {
    color: "#22C55E",
  },
});
