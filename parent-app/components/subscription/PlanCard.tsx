import React from "react";
import { colors, radius, radii, spacing } from "@/constants/theme";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import type { SubscriptionPlan } from "@/types/subscription";

const PRESSED_OPACITY = 0.88;

interface PlanCardProps {
  plan: SubscriptionPlan;
  price: number;
  interval: "monthly" | "yearly";
  onSelect: () => void;
  selected?: boolean;
}

export function PlanCard({
  plan,
  price,
  interval,
  onSelect,
  selected,
}: PlanCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        plan.popular && styles.cardPopular,
        selected && styles.cardSelected,
        pressed && { opacity: PRESSED_OPACITY },
      ]}
      onPress={onSelect}
    >
      {plan.badge && (
        <View style={[styles.badge, plan.popular && styles.badgePopular]}>
          <Text style={[styles.badgeText, plan.popular && styles.badgeTextPopular]}>
            {plan.badge}
          </Text>
        </View>
      )}
      <Text style={styles.name}>{plan.name}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{price.toLocaleString("ru")}</Text>
        <Text style={styles.period}>₽ / {interval === "yearly" ? "год" : "мес"}</Text>
      </View>
      <View style={styles.features}>
        {plan.features.map((f) => (
          <View key={f.id} style={styles.feature}>
            <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
            <Text style={styles.featureText}>{f.label}</Text>
          </View>
        ))}
      </View>
      {plan.popular ? (
        <PrimaryButton label="Выбрать" onPress={onSelect} />
      ) : (
        <SecondaryButton label="Выбрать" onPress={onSelect} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLightAlt,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel2Border,
  },
  cardPopular: {
    borderColor: colors.border,
    backgroundColor: colors.accentSoft,
  },
  cardSelected: {
    borderColor: colors.accent,
  },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceLevel2,
    borderRadius: 10,
    marginBottom: spacing.lg,
  },
  badgePopular: {
    backgroundColor: colors.accentSoft,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  badgeTextPopular: {
    color: colors.accent,
  },
  name: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 20,
  },
  price: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.text,
  },
  period: {
    fontSize: 15,
    color: colors.textMuted,
    marginLeft: 6,
  },
  features: {
    gap: 12,
    marginBottom: 24,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
