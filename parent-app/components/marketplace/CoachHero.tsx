import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSubscription } from "@/context/SubscriptionContext";
import { triggerHaptic } from "@/lib/haptics";
import { colors, glow, spacing, typography } from "@/constants/theme";

export function CoachHero() {
  const router = useRouter();
  const { hasMarketplaceDiscount } = useSubscription();

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[glow.accentSoft, "transparent"]}
        style={styles.glow}
      />
      {hasMarketplaceDiscount ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Скидка подписчика</Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.proBadge, pressed && { opacity: 0.88 }]}
          onPress={() => {
            triggerHaptic();
            router.push("/subscription");
          }}
        >
          <Text style={styles.proBadgeText}>
            Скидки и AI-рекомендации — в Pro
          </Text>
        </Pressable>
      )}
      <Text style={styles.title}>Индивидуальные тренировки</Text>
      <Text style={styles.subtitle}>
        Лучшие тренеры для развития игрока
      </Text>
      <View style={styles.aiBlock}>
        <View style={styles.aiBlockHeader}>
          <Ionicons name="sparkles" size={18} color={colors.accent} />
          <Text style={styles.aiText}>
            AI подобрал лучших тренеров для Марка Голыша
          </Text>
        </View>
      </View>
      <View style={styles.packagesRow}>
        <Pressable
          style={({ pressed }) => [styles.packagesLink, pressed && { opacity: 0.88 }]}
          onPress={() => {
            triggerHaptic();
            router.push("/marketplace/packages");
          }}
        >
          <Text style={styles.packagesLinkText}>Пакеты</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    paddingHorizontal: spacing[20],
    paddingTop: spacing[16],
    paddingBottom: spacing[16],
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  glow: {
    position: "absolute",
    top: -30,
    left: "50%",
    marginLeft: -120,
    width: 240,
    height: 100,
    borderRadius: 120,
    opacity: 0.5,
  },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 10,
    marginBottom: spacing[12],
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.success,
  },
  proBadge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.accentSoft,
    borderRadius: 10,
    marginBottom: spacing[12],
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  proBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  title: {
    ...typography.hero,
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: spacing[12],
  },
  aiBlock: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: spacing[12],
  },
  aiBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  packagesRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  packagesLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  packagesLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
});
