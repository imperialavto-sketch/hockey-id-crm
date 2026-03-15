import React from "react";
import { colors } from "@/constants/theme";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { UserSubscription } from "@/types/subscription";

const PLAN_NAMES: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  elite: "Elite",
  development_plus: "Development Plus",
};

interface CurrentPlanCardProps {
  subscription: UserSubscription;
}

export function CurrentPlanCard({ subscription }: CurrentPlanCardProps) {
  const name = PLAN_NAMES[subscription.planCode] ?? subscription.planCode;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="diamond-outline" size={24} color={colors.accent} />
        <Text style={styles.title}>Текущий план</Text>
      </View>
      <Text style={styles.planName}>{name}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Следующее списание</Text>
        <Text style={styles.value}>{subscription.currentPeriodEnd}</Text>
      </View>
      {subscription.cancelAtPeriodEnd && (
        <Text style={styles.cancelNote}>
          Подписка отменена, действует до конца периода
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentSoft,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },
  planName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F8FAFC",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 14,
    color: "#94A3B8",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  cancelNote: {
    fontSize: 13,
    color: "#F59E0B",
    marginTop: 12,
  },
});
