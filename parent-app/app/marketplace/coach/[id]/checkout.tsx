import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isDev } from "@/config/api";
import { getCoachForUI } from "@/services/marketplaceService";
import { MOCK_COACHES } from "@/constants/mockCoaches";
import { BookingSummaryCard } from "@/components/marketplace/BookingSummaryCard";
import { PriceBreakdownCard } from "@/components/marketplace/PriceBreakdownCard";
import { CheckoutButton } from "@/components/marketplace/CheckoutButton";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { SkeletonBlock } from "@/components/ui";
import {
  calculatePriceBreakdown,
  createBooking,
  createPaymentIntent,
  confirmBooking,
} from "@/services/bookingService";
import {
  mockCreateBooking,
  mockCreatePaymentIntent,
  mockConfirmBooking,
} from "@/services/bookingService.mock";
import type { TrainingFormat } from "@/types/booking";
import { FORMAT_LABELS } from "@/constants/mockTimeSlots";
import { useAuth } from "@/context/AuthContext";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography } from "@/constants/theme";
import { DEMO_PLAYER } from "@/constants/demoPlayer";

const PLAYER_ID = DEMO_PLAYER.id;
const PRESSED_OPACITY = 0.88;

function CheckoutSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={56} style={styles.skeletonCta} />
    </View>
  );
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id, date, time, duration, format, note } = useLocalSearchParams<{
    id: string;
    date: string;
    time: string;
    duration: string;
    format: string;
    note?: string;
  }>();

  const [coach, setCoach] = useState<ReturnType<typeof MOCK_COACHES.find> | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadCoach = useCallback(async () => {
    if (!id) {
      setCoachLoading(false);
      return;
    }
    setCoachLoading(true);
    setError(false);
    try {
      const c = await getCoachForUI(id);
      setCoach(c ?? (isDev ? MOCK_COACHES.find((x) => x.id === id) ?? null : null));
    } catch {
      setCoach(isDev ? MOCK_COACHES.find((x) => x.id === id) ?? null : null);
      if (!isDev) setError(true);
    } finally {
      setCoachLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCoach();
  }, [loadCoach]);

  const dur = parseInt(duration || "60", 10);
  const fmt = (format || "ice") as TrainingFormat;

  const [priceBreakdown, setPriceBreakdown] = useState(
    () =>
      coach
        ? calculatePriceBreakdown(coach.price, dur, dur === 90 ? 1.5 : 1)
        : null
  );

  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (coach)
      setPriceBreakdown(
        calculatePriceBreakdown(coach.price, dur, dur === 90 ? 1.5 : 1)
      );
  }, [coach, dur]);

  const handlePay = async () => {
    if (!coach || !priceBreakdown || !date || !time) return;

    setLoading(true);
    try {
      const payload = {
        coachId: coach.id,
        playerId: PLAYER_ID,
        date,
        time,
        duration: dur,
        format: fmt,
        note: note?.trim() || undefined,
      };

      let res = await createBooking(payload, user?.id);
      if (!res.success && isDev) {
        res = await mockCreateBooking(payload, user?.id);
      }

      if (!res.success || !res.bookingId) {
        Alert.alert("Ошибка", res.error ?? "Не удалось создать бронь");
        setLoading(false);
        return;
      }

      setBookingId(res.bookingId);

      let piRes = await createPaymentIntent(
        res.bookingId!,
        priceBreakdown.totalAmount,
        "RUB",
        user?.id
      );
      if (!piRes.success && isDev) {
        piRes = await mockCreatePaymentIntent(
          res.bookingId!,
          priceBreakdown.totalAmount,
          "RUB"
        );
      }

      if (!piRes.success) {
        Alert.alert("Ошибка", piRes.error ?? "Не удалось создать платёж");
        setLoading(false);
        return;
      }

      await new Promise((r) => setTimeout(r, 800));

      let confirmRes = await confirmBooking(
        res.bookingId!,
        piRes.paymentIntentId!,
        user?.id
      );
      if (!confirmRes.success && isDev) {
        confirmRes = await mockConfirmBooking(res.bookingId!, piRes.paymentIntentId!);
      }

      if (confirmRes.success) {
        router.replace({
          pathname: "/marketplace/booking-success",
          params: {
            bookingId: res.bookingId,
            coachName: coach.fullName,
            date,
            time,
            duration: String(dur),
            format: fmt,
            playerName: DEMO_PLAYER.name,
            total: String(priceBreakdown.totalAmount),
          },
        });
      } else {
        Alert.alert(
          "Ошибка",
          confirmRes.error ?? "Не удалось подтвердить оплату. Попробуйте ещё раз.",
          [{ text: "OK" }]
        );
      }
    } catch (e) {
      Alert.alert(
        "Ошибка",
        e instanceof Error
          ? e.message
          : "Что-то пошло не так. Проверьте подключение и попробуйте снова.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
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
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </Pressable>
      <Text style={styles.headerTitle}>Оформление бронирования</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  if (coachLoading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.paddedContent}>
          <CheckoutSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (error || !coach || !priceBreakdown || !date || !time) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Недостаточно данных</Text>
          <Text style={styles.errorSub}>
            Не удалось загрузить данные для оплаты. Вернитесь к выбору тренировки.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: PRESSED_OPACITY }]}
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
          >
            <Text style={styles.retryBtnText}>Вернуться</Text>
          </Pressable>
        </View>
      </FlagshipScreen>
    );
  }

  const dateFormatted = new Date(date + "T12:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <SectionCard title="Тренер" style={styles.sectionCard}>
          <BookingSummaryCard
            coachName={coach.fullName}
            coachPhoto={coach.photoUrl}
            specialization={coach.specialization}
            date={date}
            time={time}
            duration={dur}
            format={FORMAT_LABELS[fmt] ?? fmt}
            playerName={DEMO_PLAYER.name}
            price={priceBreakdown.coachAmount}
          />
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER)}>
        <SectionCard title="Дата и время" style={styles.sectionCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} />
            <Text style={styles.infoText}>
              {dateFormatted} · {time}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={colors.accent} />
            <Text style={styles.infoText}>
              {dur} мин · {FORMAT_LABELS[fmt]}
            </Text>
          </View>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 2)}>
        <SectionCard title="Игрок" style={styles.sectionCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={colors.accent} />
            <Text style={styles.infoText}>{DEMO_PLAYER.name}</Text>
          </View>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 3)}>
        <SectionCard title="Стоимость" style={styles.sectionCard}>
          <PriceBreakdownCard breakdown={priceBreakdown} />
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 4)}>
        <CheckoutButton
          amount={priceBreakdown.totalAmount}
          loading={loading}
          onPress={handlePay}
        />
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

  paddedContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  skeletonContent: { gap: spacing.xl },
  skeletonCard: { borderRadius: 20 },
  skeletonCta: { borderRadius: 14, marginTop: spacing.md },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  errorTitle: { ...typography.h2, color: colors.text, textAlign: "center" },
  errorSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 14,
  },
  retryBtnText: { fontSize: 16, fontWeight: "600", color: colors.onAccent },

  sectionCard: { marginBottom: spacing.xxl },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.text,
  },
});
