import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { MarketplaceBookingAuthState } from "@/components/marketplace/MarketplaceBookingAuthState";
import { getPlayers } from "@/services/playerService";
import {
  getCoachForUI,
  getMarketplaceCoachSlots,
  postMarketplaceSlotBooking,
} from "@/services/marketplaceService";
import type { MarketplaceAvailabilitySlot } from "@/services/marketplaceService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { SkeletonBlock, Input, PrimaryButton, GhostButton } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { ApiRequestError } from "@/lib/api";

const PRESSED_OPACITY = 0.88;

const TYPE_LABEL: Record<string, string> = {
  ice: "Лёд",
  gym: "Зал",
  private: "Индив.",
};

function BookingSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={120} style={styles.skeletonCard} />
      <SkeletonBlock height={200} style={styles.skeletonCard} />
      <SkeletonBlock height={80} style={styles.skeletonCard} />
    </View>
  );
}

export default function BookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    hasMarketplaceApiAuth,
  } = useAuth();
  const { id, slotId: slotIdParam } = useLocalSearchParams<{ id: string; slotId?: string }>();
  const [coach, setCoach] = useState<Awaited<ReturnType<typeof getCoachForUI>>>(null);
  const [slots, setSlots] = useState<MarketplaceAvailabilitySlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (user?.id) {
      getPlayers(user.id)
        .then((list) => {
          setPlayers(list.map((p) => ({ id: p.id, name: p.name })));
          setSelectedPlayerId(list[0]?.id ?? null);
        })
        .catch(() => {
          setPlayers([]);
          setSelectedPlayerId(null);
        });
    } else {
      setPlayers([]);
      setSelectedPlayerId(null);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.name) setParentName((n) => (n.trim() ? n : user.name));
    if (user?.phone) setParentPhone((p) => (p.trim() ? p : user.phone ?? ""));
  }, [user?.name, user?.phone]);

  const loadData = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const [c, list] = await Promise.all([
        getCoachForUI(id),
        getMarketplaceCoachSlots(id),
      ]);
      setCoach(c ?? null);
      setSlots(list);
      const param = typeof slotIdParam === "string" ? slotIdParam : "";
      const exists = param && list.some((s) => s.id === param);
      setSelectedSlotId(exists ? param : list[0]?.id ?? null);
    } catch {
      setCoach(null);
      setSlots([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, slotIdParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === selectedSlotId) ?? null,
    [slots, selectedSlotId]
  );

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
      <Text style={styles.headerTitle}>Бронирование</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  const handleBook = async () => {
    if (!id || !selectedSlot) return;
    const name = parentName.trim();
    const phone = parentPhone.trim();
    if (!name || !phone) {
      Alert.alert("Заполните поля", "Укажите имя и телефон для связи с тренером.");
      return;
    }
    if (!hasMarketplaceApiAuth) {
      router.push("/(auth)/login");
      return;
    }
    triggerHaptic();
    setSubmitting(true);
    try {
      const res = await postMarketplaceSlotBooking({
        slotId: selectedSlot.id,
        coachId: id,
        parentName: name,
        parentPhone: phone,
        playerId: selectedPlayerId,
        message: message.trim() || null,
      });
      if (!res.ok) {
        if (res.status === 401) {
          Alert.alert(
            "Сессия истекла",
            "Войдите снова, чтобы завершить бронирование.",
            [
              { text: "Отмена", style: "cancel" },
              { text: "Войти", onPress: () => router.push("/(auth)/login") },
            ]
          );
          return;
        }
        if (res.status === 403) {
          Alert.alert(
            "Нет доступа",
            res.error || "Бронирование доступно только родительскому аккаунту."
          );
          return;
        }
        const is409 =
          res.status === 409 ||
          res.code === "SLOT_ALREADY_BOOKED" ||
          (res.error && res.error.includes("занят"));
        Alert.alert(
          is409 ? "Слот занят" : "Не удалось забронировать",
          res.error || "Попробуйте выбрать другое время."
        );
        if (is409) loadData();
        return;
      }
      const b = res.booking;
      const timeRange = `${b.startTime}–${b.endTime}`;
      router.replace(
        `/marketplace/booking-success?${new URLSearchParams({
          coachName: coach?.fullName ?? "Тренер",
          date: b.date,
          time: timeRange,
          duration: "60",
          format: b.type || "ice",
          playerName: players.find((p) => p.id === selectedPlayerId)?.name ?? "",
          total: String(b.price),
        }).toString()}`
      );
    } catch (e) {
      const msg =
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Ошибка сети";
      Alert.alert("Ошибка", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.paddedContent}>
          <BookingSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (!isAuthenticated) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <MarketplaceBookingAuthState
          kind="login_required"
          onPrimary={() => router.push("/(auth)/login")}
          secondaryLabel="Назад"
          onSecondary={() => router.back()}
        />
      </FlagshipScreen>
    );
  }

  if (!hasMarketplaceApiAuth) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <MarketplaceBookingAuthState
          kind="phone_confirmation_required"
          onPrimary={() => router.push("/(auth)/login")}
          secondaryLabel="Назад"
          onSecondary={() => router.back()}
        />
      </FlagshipScreen>
    );
  }

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.paddedContent}>
          <BookingSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (error || !coach) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Тренер не найден</Text>
          <Text style={styles.errorSub}>
            Проверьте ссылку или вернитесь к выбору тренера
          </Text>
          <GhostButton
            label="Вернуться"
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
          />
        </View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen header={header}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      >
        <Animated.View entering={screenReveal(0)}>
          <SectionCard title={coach.fullName} style={styles.sectionCard}>
            <Text style={styles.coachMeta}>
              {[coach.city, coach.formatsLine].filter(Boolean).join(" · ")}
            </Text>
            {coach.price > 0 && (
              <Text style={styles.coachPrice}>
                от {coach.price.toLocaleString("ru")} ₽ / занятие
              </Text>
            )}
          </SectionCard>
        </Animated.View>

        <Animated.View entering={screenReveal(STAGGER)}>
          <SectionCard title="Выберите слот" style={styles.sectionCard}>
            {slots.length === 0 ? (
              <Text style={styles.hintText}>
                Нет свободных слотов. Загляните позже.
              </Text>
            ) : (
              <View style={styles.slotPickList}>
                {slots.map((s) => {
                  const active = s.id === selectedSlotId;
                  const dateLabel =
                    s.date.length >= 10
                      ? new Date(`${s.date}T12:00:00`).toLocaleDateString("ru-RU", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })
                      : s.date;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        triggerHaptic();
                        setSelectedSlotId(s.id);
                      }}
                      style={[
                        styles.slotPick,
                        active && styles.slotPickActive,
                      ]}
                    >
                      <Text style={styles.slotPickDate}>{dateLabel}</Text>
                      <Text style={styles.slotPickTime}>
                        {s.startTime} – {s.endTime}
                      </Text>
                      <Text style={styles.slotPickSub}>
                        {TYPE_LABEL[s.type] ?? s.type} · {s.price.toLocaleString("ru")} ₽
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </SectionCard>
        </Animated.View>

        <Animated.View entering={screenReveal(STAGGER * 2)}>
          <SectionCard title="Контакты" style={styles.sectionCard}>
            <Input
              placeholder="Ваше имя"
              value={parentName}
              onChangeText={setParentName}
            />
            <View style={styles.inputGap} />
            <Input
              placeholder="Телефон"
              value={parentPhone}
              onChangeText={setParentPhone}
              keyboardType="phone-pad"
            />
          </SectionCard>
        </Animated.View>

        {players.length > 0 && (
          <Animated.View entering={screenReveal(STAGGER * 2.5)}>
            <SectionCard title="Игрок (опционально)" style={styles.sectionCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.playerChips}>
                  {players.map((p) => {
                    const on = p.id === selectedPlayerId;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          triggerHaptic();
                          setSelectedPlayerId(p.id);
                        }}
                        style={[styles.playerChip, on && styles.playerChipOn]}
                      >
                        <Text style={[styles.playerChipText, on && styles.playerChipTextOn]}>
                          {p.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </SectionCard>
          </Animated.View>
        )}

        <Animated.View entering={screenReveal(STAGGER * 3)}>
          <SectionCard title="Сообщение тренеру" style={styles.sectionCard}>
            <Input
              placeholder="Пожелания по тренировке…"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />
          </SectionCard>
        </Animated.View>

        <Animated.View entering={screenReveal(STAGGER * 4)} style={styles.ctaWrap}>
          <PrimaryButton
            label={submitting ? "Отправка…" : "Забронировать слот"}
            onPress={handleBook}
            disabled={!selectedSlot || slots.length === 0 || submitting}
          />
        </Animated.View>
      </ScrollView>
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
  skeletonCard: { borderRadius: radius.lg },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  errorTitle: { ...typography.h2, color: colors.text, textAlign: "center" },
  errorSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },

  sectionCard: { marginBottom: spacing.xl, marginHorizontal: spacing.screenPadding },
  coachMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  coachPrice: {
    ...typography.body,
    fontWeight: "700",
    color: colors.accent,
    marginTop: spacing.sm,
  },
  hintText: { ...typography.bodySmall, color: colors.textSecondary },
  slotPickList: { gap: spacing.sm },
  slotPick: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  slotPickActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  slotPickDate: { ...typography.caption, color: colors.textSecondary },
  slotPickTime: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
    marginTop: 4,
  },
  slotPickSub: { ...typography.captionSmall, color: colors.textMuted, marginTop: 4 },
  inputGap: { height: spacing.md },
  playerChips: { flexDirection: "row", gap: spacing.sm },
  playerChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  playerChipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  playerChipText: { ...typography.caption, fontWeight: "600", color: colors.textSecondary },
  playerChipTextOn: { color: colors.accent },
  ctaWrap: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.screenPadding,
  },
});
