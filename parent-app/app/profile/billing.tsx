import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { CurrentPlanCard } from "@/components/subscription/CurrentPlanCard";
import { BillingHistoryCard } from "@/components/subscription/BillingHistoryCard";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";

const PRESSED_OPACITY = 0.88;

export default function BillingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    subscription,
    billingHistory,
    cancelSubscription,
    setMockMode,
  } = useSubscription();

  const hasActiveSub =
    subscription &&
    (subscription.status === "active" || subscription.cancelAtPeriodEnd);

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
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </Pressable>
      <Text style={styles.headerTitle}>Подписка и оплаты</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  return (
    <FlagshipScreen header={header}>
      {hasActiveSub ? (
        <>
          <Animated.View entering={screenReveal(0)}>
            <CurrentPlanCard subscription={subscription!} />
          </Animated.View>
          <Animated.View entering={screenReveal(STAGGER)}>
            <SectionCard title="Управление" style={styles.menuSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.menuBtn,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={() => {
                  triggerHaptic();
                  router.push("/subscription");
                }}
              >
                <Ionicons name="swap-horizontal-outline" size={22} color={colors.accent} />
                <Text style={styles.menuBtnText}>Изменить тариф</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.menuBtn,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={() => {
                  triggerHaptic();
                  Alert.alert(
                    "Скоро будет доступно",
                    "Обновление способа оплаты находится в разработке."
                  );
                }}
              >
                <Ionicons name="card-outline" size={22} color={colors.accent} />
                <Text style={styles.menuBtnText}>Обновить способ оплаты</Text>
              </Pressable>
              {!subscription!.cancelAtPeriodEnd && (
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    pressed && { opacity: PRESSED_OPACITY },
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    cancelSubscription();
                  }}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                  <Text style={styles.cancelBtnText}>Отменить подписку</Text>
                </Pressable>
              )}
            </SectionCard>
          </Animated.View>
        </>
      ) : (
        <Animated.View entering={screenReveal(0)}>
          <View style={styles.noSub}>
            <View style={styles.noSubIconWrap}>
              <Ionicons name="card-outline" size={32} color={colors.textMuted} />
            </View>
            <Text style={styles.noSubText}>У вас нет активной подписки</Text>
            <Pressable
              style={({ pressed }) => [styles.cta, pressed && { opacity: PRESSED_OPACITY }]}
              onPress={() => {
                triggerHaptic();
                router.push("/subscription");
              }}
            >
              <Text style={styles.ctaText}>Выбрать план</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {__DEV__ && (
        <Animated.View entering={screenReveal(STAGGER * 2)}>
          <View style={styles.devPanel}>
            <Text style={styles.devTitle}>[DEV] Mock state</Text>
            <View style={styles.devRow}>
              {(["none", "pro", "elite", "membership", "package"] as const).map((m) => (
                <Pressable
                  key={m}
                  style={({ pressed }) => [styles.devBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => {
                    triggerHaptic();
                    setMockMode(m);
                  }}
                >
                  <Text style={styles.devBtnText}>{m}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>
      )}

      <Animated.View entering={screenReveal(hasActiveSub ? STAGGER * 2 : STAGGER)}>
        <Text style={styles.sectionTitle}>История платежей</Text>
        {billingHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyHistoryText}>Пока нет платежей</Text>
            <Text style={styles.emptyHistorySub}>
              Здесь будут отображаться ваши операции по подписке
            </Text>
          </View>
        ) : (
          billingHistory.map((r) => (
            <BillingHistoryCard key={r.id} record={r} />
          ))
        )}
      </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", lineHeight: 22, color: "#ffffff" },
  headerBtn: { width: 40, height: 40 },

  menuSection: { marginBottom: spacing.xl },
  menuBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  menuBtnText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.accent,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  cancelBtnText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.error,
  },

  noSub: {
    marginBottom: spacing.xxxl,
    padding: spacing.xxl,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
  },
  noSubIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surfaceLevel2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  noSubText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  cta: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaText: {
    ...typography.body,
    fontWeight: "700",
    color: "#ffffff",
  },

  devPanel: {
    marginBottom: spacing.xxl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  devTitle: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  devRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  devBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
  },
  devBtnText: {
    ...typography.captionSmall,
    fontWeight: "600",
    color: colors.accent,
  },

  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  emptyHistory: {
    padding: spacing.xxl,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyHistoryText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  emptyHistorySub: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
});
