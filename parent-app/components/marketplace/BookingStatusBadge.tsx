import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography } from "@/constants/theme";
import type { BookingStatus, PaymentStatus } from "@/types/booking";

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
  completed: "Завершено",
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Не оплачено",
  processing: "Обработка",
  paid: "Оплачено",
  failed: "Ошибка",
  refunded: "Возврат",
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
}

export function BookingStatusBadge({ status, paymentStatus }: BookingStatusBadgeProps) {
  const getStatusStyle = () => {
    if (paymentStatus === "paid" || status === "confirmed" || status === "completed")
      return styles.badgeSuccess;
    if (status === "cancelled" || paymentStatus === "failed") return styles.badgeError;
    return styles.badgePending;
  };

  const label = paymentStatus === "paid" ? PAYMENT_LABELS.paid : STATUS_LABELS[status];

  return (
    <View style={[styles.badge, getStatusStyle()]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSuccess: {
    backgroundColor: "rgba(34,197,94,0.2)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.4)",
  },
  badgeError: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
  },
  badgePending: {
    backgroundColor: "rgba(251,191,36,0.2)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.4)",
  },
  badgeText: {
    ...typography.captionSmall,
    fontWeight: "700",
    color: colors.text,
  },
});
