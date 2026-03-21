import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { PrimaryButton } from "@/components/ui";
import { triggerHaptic } from "@/lib/haptics";
import { screenReveal, STAGGER } from "@/lib/animations";
import { colors, spacing, typography } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";

const PRESSED_OPACITY = 0.88;

const PLAN_NAMES: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  elite: "Elite",
  development_plus: "Development Plus",
  package: "Пакет тренировок",
};
type ConfirmationState = "checking" | "confirmed" | "unconfirmed";

export default function SubscriptionSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plan } = useLocalSearchParams<{ plan?: string }>();
  const { refreshSubscription } = useSubscription();
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>("checking");

  const verifySubscription = useCallback(async () => {
    setConfirmationState("checking");
    try {
      const subscription = await refreshSubscription();
      const isActive =
        subscription != null &&
        (subscription.status === "active" || Boolean(subscription.cancelAtPeriodEnd));
      const matchesPlan = plan ? subscription?.planCode === plan : true;

      setConfirmationState(isActive && matchesPlan ? "confirmed" : "unconfirmed");
    } catch (err) {
      if (__DEV__) {
        console.warn("[subscription] failed to refresh after success", err);
      }
      setConfirmationState("unconfirmed");
    }
  }, [plan, refreshSubscription]);

  useEffect(() => {
    verifySubscription();
  }, [verifySubscription]);

  const planName = plan ? PLAN_NAMES[plan] ?? plan : "Покупка";

  const header = (
    <View style={[styles.customHeader, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.headerSpacer} />
      <Text style={styles.headerTitle}>Подписка</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  return (
    <FlagshipScreen header={header} scroll={false}>
      <View style={styles.content}>
        <Animated.View entering={screenReveal(0)} style={styles.heroSection}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={
                confirmationState === "confirmed"
                  ? "checkmark-circle"
                  : confirmationState === "checking"
                    ? "time-outline"
                    : "alert-circle-outline"
              }
              size={72}
              color={
                confirmationState === "confirmed"
                  ? colors.success
                  : confirmationState === "checking"
                    ? colors.accent
                    : colors.textMuted
              }
            />
          </View>
          <Text style={styles.title}>
            {confirmationState === "confirmed"
              ? "Подписка активирована"
              : confirmationState === "checking"
                ? "Проверяем активацию"
                : "Подписка пока не подтверждена"}
          </Text>
          <Text style={styles.subtitle}>
            {confirmationState === "confirmed"
              ? `${planName} успешно подключена. Полный доступ к функциям активен.`
              : confirmationState === "checking"
                ? `Подтягиваем актуальный статус ${planName}. Это займёт всего несколько секунд.`
                : `Мы пока не смогли подтвердить ${planName}. Проверьте статус подписки или попробуйте ещё раз позже.`}
          </Text>
        </Animated.View>

        <Animated.View entering={screenReveal(STAGGER)} style={styles.actions}>
          <View style={styles.primaryBtnWrap}>
            <PrimaryButton
              label={
                confirmationState === "confirmed" ? "В профиль" : "Проверить ещё раз"
              }
              onPress={() => {
                triggerHaptic();
                if (confirmationState === "confirmed") {
                  router.replace("/(tabs)/more");
                  return;
                }
                verifySubscription();
              }}
            />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { opacity: PRESSED_OPACITY },
            ]}
            onPress={() => {
              triggerHaptic();
              router.replace("/profile/billing");
            }}
          >
            <Text style={styles.secondaryBtnText}>
              {confirmationState === "confirmed" ? "Подписка и оплаты" : "Проверить статус подписки"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  headerSpacer: { width: 44, height: 44 },
  headerTitle: {
    flex: 1,
    ...typography.sectionTitle,
    color: colors.text,
    textAlign: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxxl,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.successSoft,
    borderWidth: 2,
    borderColor: "rgba(57,217,138,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  actions: {
    width: "100%",
    gap: spacing.md,
  },
  primaryBtnWrap: {
    width: "100%",
  },
  secondaryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    alignItems: "center",
  },
  secondaryBtnText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "600",
  },
});
