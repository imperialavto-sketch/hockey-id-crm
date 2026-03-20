import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MEMBERSHIP_PLANS } from "@/constants/mockPlans";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { triggerHaptic } from "@/lib/haptics";
import { screenReveal, STAGGER } from "@/lib/animations";
import { colors, spacing, radius, radii, typography, buttonStyles } from "@/constants/theme";

const PRESSED_OPACITY = 0.88;

export default function MembershipScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plan = MEMBERSHIP_PLANS[0];
  const keyBenefits = [
    "Персональные рекомендации по развитию игрока",
    "Понятные зоны роста и приоритеты на ближайший цикл",
    "Фокус тренера и практические советы для семьи",
    "Доступ к плану развития и premium-инструментам",
  ];
  const useCases = [
    "понимать, на чём сосредоточиться уже сейчас",
    "спокойно обсуждать прогресс с тренером",
    "видеть не только результат, но и направление роста",
  ];

  const handleOpenPlans = () => {
    triggerHaptic();
    router.push("/subscription");
  };

  const header = (
    <View style={[styles.customHeader, { paddingTop: insets.top + spacing.lg }]}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => {
          triggerHaptic();
          router.back();
        }}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="chevron-back" size={28} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Development Membership</Text>
    </View>
  );

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Флагманский продукт</Text>
          </View>
          <Text style={styles.heroTitle}>Раскройте потенциал вашего ребенка</Text>
          <Text style={styles.heroDesc}>
            AI анализ показывает, как стать сильнее на льду: что уже получается, где зона роста и
            какие действия дадут самый заметный прогресс.
          </Text>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>
              {plan.priceMonthly.toLocaleString("ru")} ₽
            </Text>
            <Text style={styles.pricePeriod}>/ месяц</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER)}>
        <SectionCard title="Что вы получаете" style={styles.featuresSection}>
          {keyBenefits.map((label) => (
            <View key={label} style={styles.feature}>
              <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              <Text style={styles.featureText}>{label}</Text>
            </View>
          ))}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 2)}>
        <SectionCard title="Вы уже видели часть анализа" style={styles.aiUnlockSection}>
          <Text style={styles.aiUnlockTitle}>Разблокируйте полный AI отчёт</Text>
          <Text style={styles.aiUnlockText}>
            Полный доступ открывает сильные стороны, зоны роста, рекомендации и следующий шаг
            развития в одном месте.
          </Text>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 3)}>
        <SectionCard title="Родители используют это, чтобы" style={styles.featuresSection}>
          {useCases.map((label) => (
            <View key={label} style={styles.feature}>
              <Ionicons name="sparkles-outline" size={20} color={colors.accent} />
              <Text style={styles.featureText}>{label}</Text>
            </View>
          ))}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 4)}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: PRESSED_OPACITY }]}
          onPress={handleOpenPlans}
          accessibilityRole="button"
          accessibilityLabel="Перейти к выбору плана"
        >
          <Text style={styles.ctaText}>Разблокировать полный AI анализ</Text>
          <Text style={styles.ctaSubtext}>Доступ к рекомендациям и развитию</Text>
        </Pressable>
      </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.sectionTitle,
    flex: 1,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  hero: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.xl,
    padding: spacing.xxxl,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radii.sm,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.md,
  },
  heroDesc: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.accent,
  },
  pricePeriod: {
    fontSize: 18,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  featureText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  featuresSection: {
    marginBottom: spacing.xxl,
  },
  aiUnlockSection: {
    marginBottom: spacing.xxl,
  },
  aiUnlockTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  aiUnlockText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  cta: {
    height: buttonStyles.primary.height,
    backgroundColor: colors.accent,
    borderRadius: buttonStyles.primary.radius,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.bgDeep,
  },
  ctaSubtext: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(2,9,22,0.72)",
  },
});
