import React from "react";
import { colors } from "@/constants/theme";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSubscription } from "@/context/SubscriptionContext";

export function CoachHeader() {
  const router = useRouter();
  const { hasMarketplaceDiscount } = useSubscription();
  return (
    <View style={styles.wrap}>
      {hasMarketplaceDiscount ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Скидка подписчика</Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.benefitsBadge, pressed && { opacity: 0.8 }]}
          onPress={() => router.push("/subscription")}
        >
          <Text style={styles.benefitsBadgeText}>
            Скидки и AI-рекомендации — в Pro
          </Text>
        </Pressable>
      )}
      <View style={styles.titleRow}>
        <Text style={styles.title}>Индивидуальные тренировки</Text>
        <Pressable
          style={({ pressed }) => [styles.packagesLink, pressed && { opacity: 0.8 }]}
          onPress={() => router.push("/marketplace/packages")}
        >
          <Text style={styles.packagesLinkText}>Пакеты</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Лучшие тренеры для развития игрока</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(34,197,94,0.2)",
    borderRadius: 10,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#22C55E",
  },
  benefitsBadge: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefitsBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packagesLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  packagesLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 8,
    fontWeight: "500",
  },
});
