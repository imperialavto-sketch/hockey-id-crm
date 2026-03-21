import React from "react";
import { colors, radius, radii, spacing } from "@/constants/theme";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { triggerHaptic } from "@/lib/haptics";
import { PrimaryButton } from "@/components/ui";
import type { TrainingPackage } from "@/types/subscription";

const PRESSED_OPACITY = 0.88;

interface PackageCardProps {
  pkg: TrainingPackage;
  onSelect: () => void;
}

export function PackageCard({ pkg, onSelect }: PackageCardProps) {
  const handlePress = () => {
    triggerHaptic();
    onSelect();
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: PRESSED_OPACITY }]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Купить пакет ${pkg.name}`}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{pkg.name}</Text>
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{pkg.discountPercent}%</Text>
        </View>
      </View>
      <Text style={styles.sessions}>{pkg.sessionsCount} тренировок</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceOld}>
          {pkg.priceBase.toLocaleString("ru")} ₽
        </Text>
        <Text style={styles.price}>
          от {pkg.priceDiscounted.toLocaleString("ru")} ₽
        </Text>
      </View>
      <Text style={styles.outcome}>{pkg.targetOutcome}</Text>
      <Text style={styles.suitable}>{pkg.suitableFor}</Text>
      <PrimaryButton
        label="Купить пакет"
        onPress={handlePress}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLightAlt,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.surfaceLevel2Border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  name: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
  },
  discountBadge: {
    backgroundColor: colors.successSoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xs,
  },
  discountText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.success,
  },
  sessions: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  priceOld: {
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  outcome: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  suitable: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
});
