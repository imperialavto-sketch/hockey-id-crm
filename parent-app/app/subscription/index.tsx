import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSubscriptionPlans, createSubscription } from "@/services/subscriptionService";
import { SubscriptionHero } from "@/components/subscription/SubscriptionHero";
import { PricingToggle } from "@/components/subscription/PricingToggle";
import { PlanCard } from "@/components/subscription/PlanCard";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock, ErrorStateView } from "@/components/ui";
import { triggerHaptic } from "@/lib/haptics";
import { screenReveal, STAGGER } from "@/lib/animations";
import { colors, spacing } from "@/constants/theme";
import { isDemoMode } from "@/config/api";
import type { SubscriptionPlan } from "@/types/subscription";

const PRESSED_OPACITY = 0.88;

function PlansSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={180} style={styles.skeletonCard} />
      <SkeletonBlock height={160} style={styles.skeletonCard} />
    </View>
  );
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mountedRef = useRef(true);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectingPlanId, setSelectingPlanId] = useState<string | null>(null);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const loadPlans = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(false);
    try {
      const data = await getSubscriptionPlans();
      if (!mountedRef.current) return;
      setPlans(data ?? []);
      setError(false);
    } catch {
      if (mountedRef.current) {
        setPlans([]);
        setError(true);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (selectingPlanId) return;
    triggerHaptic();

    if (isDemoMode) {
      Alert.alert(
        "Подтверждение недоступно",
        "В демо-режиме оформление подписки не подтверждается. Откройте live backend flow для реальной проверки."
      );
      return;
    }

    setSelectingPlanId(plan.id);

    try {
      const sub = await createSubscription(plan.id);
      if (sub) {
        router.push({
          pathname: "/subscription/success",
          params: { plan: plan.code },
        });
        return;
      }

      Alert.alert("Ошибка", "Не удалось оформить подписку. Попробуйте позже.");
    } catch {
      Alert.alert("Ошибка", "Не удалось оформить подписку. Проверьте соединение и попробуйте снова.");
    } finally {
      setSelectingPlanId(null);
    }
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
      <Text style={styles.headerTitle}>Подписка</Text>
    </View>
  );

  if (error) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <ErrorStateView
          variant="network"
          title="Не удалось загрузить планы"
          subtitle="Проверьте соединение и попробуйте снова"
          onAction={loadPlans}
          style={styles.errorWrap}
        />
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <SubscriptionHero />
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER)}>
        <PricingToggle
          value={interval}
          onChange={setInterval}
          yearlyDiscount="2 месяца в подарок"
        />
      </Animated.View>

      {loading ? (
        <Animated.View entering={screenReveal(STAGGER)}>
          <PlansSkeleton />
        </Animated.View>
      ) : plans.length > 0 ? (
        <Animated.View entering={screenReveal(STAGGER * 2)}>
          <View style={styles.plans}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                price={
                  interval === "yearly"
                    ? Math.round(plan.priceYearly / 12)
                    : plan.priceMonthly
                }
                interval={interval}
                onSelect={() => handleSelectPlan(plan)}
                selected={selectingPlanId === plan.id}
              />
            ))}
          </View>
        </Animated.View>
      ) : (
        <Animated.View entering={screenReveal(STAGGER * 2)} style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyText}>Планы временно недоступны</Text>
          <Text style={styles.emptySub}>Попробуйте позже</Text>
        </Animated.View>
      )}

      <Animated.View entering={screenReveal(STAGGER * 3)}>
        <ActionLinkCard
          icon="star"
          title="Membership — полный комплект"
          description="AI Report, план развития, видео-анализ и больше"
          onPress={() => {
            triggerHaptic();
            router.push("/subscription/membership");
          }}
          variant="default"
        />
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
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginLeft: spacing.sm,
  },
  plans: {
    marginBottom: spacing.xxl,
  },
  skeletonContent: {
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  skeletonCard: {
    borderRadius: 24,
  },
  emptyWrap: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surfaceLevel1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textMuted,
  },
  errorWrap: {
    flex: 1,
  },
});
