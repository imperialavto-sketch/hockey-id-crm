import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, cardStyles } from "@/constants/theme";
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

  const goTo = (path: string) => {
    triggerHaptic();
    router.push(path);
  };

  if (isActive && subscription) {
    const planName = PLAN_NAMES[subscription.planCode] ?? subscription.planCode;
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => goTo("/profile/billing")}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={24} color={colors.accent} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Hockey ID Premium</Text>
          <Text style={styles.subtitle}>Тариф: {planName}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
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
          AI Report, план развития, скидки
        </Text>
      </View>
      <Text style={styles.ctaText}>Подключить</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cardStyles.backgroundColor,
    borderRadius: cardStyles.radius,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(46,167,255,0.22)",
  },
  cardCta: {
    borderColor: "rgba(46,167,255,0.35)",
    backgroundColor: "rgba(46,167,255,0.08)",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(46,167,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  subtitleCta: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "500",
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
    fontWeight: "300",
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.accent,
  },
});
