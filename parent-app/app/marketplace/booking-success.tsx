import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { PrimaryButton, SecondaryButton, GhostButton } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { FORMAT_LABELS } from "@/constants/mockTimeSlots";

const PRESSED_OPACITY = 0.88;

export default function BookingSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    coachName,
    date,
    time,
    duration,
    format,
    playerName,
    total,
  } = useLocalSearchParams<{
    coachName?: string;
    date?: string;
    time?: string;
    duration?: string;
    format?: string;
    playerName?: string;
    total?: string;
  }>();

  const dateFormatted = date
    ? new Date(date + "T12:00:00").toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      })
    : "—";
  const totalFormatted = total ? `${Number(total).toLocaleString("ru")} ₽` : "—";
  const durationLabel = duration ? `${duration} мин` : null;
  const formatLabel = format ? (FORMAT_LABELS[format] ?? format) : null;

  const goTo = (path: string) => {
    triggerHaptic();
    router.replace(path as never);
  };

  const header = (
    <View style={[styles.customHeader, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.headerSpacer} />
      <Text style={styles.headerTitle}>Бронирование</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  return (
    <FlagshipScreen header={header}>
      <View style={styles.content}>
        <Animated.View entering={screenReveal(0)} style={styles.heroSection}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="checkmark-circle"
              size={72}
              color={colors.success}
            />
          </View>
          <Text style={styles.title}>Тренировка забронирована</Text>
          <Text style={styles.subtitle}>
            Подтверждение отправлено на вашу почту
          </Text>
        </Animated.View>

        <Animated.View entering={screenReveal(STAGGER)}>
          <SectionCard title="Детали бронирования" style={styles.summaryCard}>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Тренер</Text>
              <Text style={styles.coachName}>{coachName ?? "Тренер"}</Text>
            </View>
            {playerName ? (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Игрок</Text>
                <Text style={styles.detailValue}>{playerName}</Text>
              </View>
            ) : null}
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Дата и время</Text>
              <Text style={styles.detailValue}>
                {dateFormatted} · {time ?? "—"}
              </Text>
            </View>
            {(durationLabel || formatLabel) ? (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Сессия</Text>
                <Text style={styles.detailValue}>
                  {[durationLabel, formatLabel].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ) : null}
            <View style={[styles.detailBlock, styles.detailBlockLast]}>
              <Text style={styles.detailLabel}>Оплачено</Text>
              <Text style={styles.detailValue}>{totalFormatted}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={18} color={colors.success} />
              <Text style={styles.badgeText}>Оплачено и подтверждено</Text>
            </View>
          </SectionCard>
        </Animated.View>

        <Animated.View entering={screenReveal(STAGGER * 2)} style={styles.ctaWrap}>
          <PrimaryButton
            label="Мои бронирования"
            onPress={() => goTo("/bookings")}
          />
          <SecondaryButton
            label="На главную"
            onPress={() => goTo("/(tabs)")}
          />
          <SecondaryButton
            label="В профиль"
            onPress={() => goTo("/(tabs)/more")}
          />
          <GhostButton
            label="Найти ещё тренера"
            onPress={() => goTo("/marketplace/coaches")}
          />
        </Animated.View>
      </View>
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
    borderBottomColor: colors.surfaceLevel1Border,
  },
  headerSpacer: { width: 40, height: 40 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    color: colors.text,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xxxl,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.successSoft,
    borderWidth: 2,
    borderColor: "rgba(57,217,138,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },

  summaryCard: {
    marginBottom: spacing.xxl,
  },
  detailBlock: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  detailBlockLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.text,
  },
  coachName: {
    ...typography.cardTitle,
    color: colors.accent,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(57,217,138,0.3)",
    alignSelf: "flex-start",
  },
  badgeText: {
    ...typography.bodySmall,
    fontWeight: "700",
    color: colors.success,
  },

  ctaWrap: {
    gap: spacing.lg,
  },
});
