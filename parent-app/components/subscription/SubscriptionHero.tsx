import React from "react";
import { colors, radius, spacing } from "@/constants/theme";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SubscriptionHeroProps {
  title?: string;
  subtitle?: string;
}

export function SubscriptionHero({
  title = "Hockey ID Premium",
  subtitle = "Coach Mark как персональный тренер + полный AI-анализ",
}: SubscriptionHeroProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name="sparkles" size={32} color={colors.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.descCard}>
        <Text style={styles.desc}>
          Персональные рекомендации, еженедельные отчёты Coach Mark, полный AI-анализ
          и план развития — всё в одном месте.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xxl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  descCard: {
    padding: spacing.xl,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  desc: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
