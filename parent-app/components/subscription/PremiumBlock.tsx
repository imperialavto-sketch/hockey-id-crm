import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";
import { useSubscription } from "@/context/SubscriptionContext";

const PRESSED_OPACITY = 0.88;

const PLAN_NAMES: Record<string, string> = {
  basic: "Базовый",
  pro: "Pro",
  elite: "Elite",
  development_plus: "Development Plus",
};

export function PremiumBlock() {
  const router = useRouter();
  const { subscription, hasProOrAbove } = useSubscription();
  const isActive =
    subscription &&
    (subscription.status === "active" || subscription.cancelAtPeriodEnd);

  const goTo = (path: Href) => {
    triggerHaptic();
    router.push(path);
  };

  if (isActive && subscription) {
    const planName = PLAN_NAMES[subscription.planCode] ?? subscription.planCode;
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => goTo("/profile/billing" as Href)}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={24} color={colors.accent} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Hockey ID Premium</Text>
          <Text style={styles.subtitle}>Тариф: {planName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, styles.cardCta, pressed && { opacity: PRESSED_OPACITY }]}
      onPress={() => goTo("/subscription")}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="sparkles" size={24} color={colors.accent} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Hockey ID Premium</Text>
        <Text style={styles.subtitleCta}>
          Арена как тренер, AI-анализ, план развития
        </Text>
      </View>
      <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>Подключить</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} />
        </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  cardCta: {
    borderColor: "rgba(59,130,246,0.3)",
    backgroundColor: colors.accentSoft,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.cardTitle,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.textSecondary,
  },
  subtitleCta: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  ctaText: {
    ...typography.bodySmall,
    fontSize: 15,
    fontWeight: "700",
    color: colors.accent,
  },
});
