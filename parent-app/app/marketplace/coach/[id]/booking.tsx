import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { getPlayers } from "@/services/playerService";
import { getCoachForUI, getCoachTimeSlots } from "@/services/marketplaceService";
import { DURATION_OPTIONS, FORMAT_LABELS } from "@/constants/mockTimeSlots";
import { BookingSummaryCard } from "@/components/marketplace/BookingSummaryCard";
import { BookingDatePicker } from "@/components/marketplace/BookingDatePicker";
import { TimeSlotPicker } from "@/components/marketplace/TimeSlotPicker";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { SkeletonBlock } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import type { TrainingFormat } from "@/types/booking";
import { colors, spacing, typography, radius } from "@/constants/theme";

const PRESSED_OPACITY = 0.88;

const FORMAT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  ice: "snow-outline",
  gym: "fitness-outline",
  online: "desktop-outline",
};

function BookingSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={80} style={styles.skeletonCard} />
      <SkeletonBlock height={56} style={styles.skeletonCta} />
    </View>
  );
}

export default function BookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [format, setFormat] = useState<TrainingFormat>("ice");
  const [note, setNote] = useState("");
  const [coach, setCoach] = useState<Awaited<ReturnType<typeof getCoachForUI>>>(null);
  const [players, setPlayers] = useState<{ name: string }[]>([]);
  const [timeSlots, setTimeSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (user?.id) {
      getPlayers(user.id).then((list) => setPlayers(list)).catch(() => setPlayers([]));
    } else {
      setPlayers([]);
    }
  }, [user?.id]);

  const loadData = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const [c, slots] = await Promise.all([
        getCoachForUI(id),
        getCoachTimeSlots(id, undefined),
      ]);
      setCoach(c ?? null);
      setTimeSlots(slots.length > 0 ? slots : []);
    } catch {
      setCoach(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!id || !date) return;
    getCoachTimeSlots(id, date)
      .then((slots) => {
        if (slots.length > 0) setTimeSlots(slots);
      })
      .catch(() => {
        setError(true);
      });
  }, [id, date]);

  const price = coach ? (duration === 90 ? Math.round(coach.price * 1.5) : coach.price) : 0;
  const canContinue = date && time;

  const handleContinue = () => {
    if (!id || !canContinue) return;
    triggerHaptic();
    const params = new URLSearchParams({
      date,
      time,
      duration: String(duration),
      format,
    });
    if (note.trim()) params.set("note", note.trim());
    router.push(`/marketplace/coach/${id}/checkout?${params.toString()}`);
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
      <Text style={styles.headerTitle}>Бронирование</Text>
      <View style={styles.headerBtn} />
    </View>
  );

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

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <BookingSummaryCard
          coachName={coach.fullName}
          coachPhoto={coach.photoUrl}
          specialization={coach.specialization}
          date={date}
          time={time}
          duration={duration}
          format={FORMAT_LABELS[format] ?? format}
          playerName={players[0]?.name ?? "Игрок не выбран"}
          price={price}
        />
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER)}>
        <SectionCard title="Дата" style={styles.sectionCard}>
          <BookingDatePicker selectedDate={date} onSelect={(d) => { triggerHaptic(); setDate(d); }} />
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 2)}>
        <SectionCard title="Время" style={styles.sectionCard}>
          <TimeSlotPicker
            slots={timeSlots}
            selectedTime={time}
            onSelect={(t) => { triggerHaptic(); setTime(t); }}
          />
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 3)}>
        <SectionCard title="Длительность" style={styles.sectionCard}>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.durationChip,
                  duration === opt.value && styles.durationChipActive,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={() => {
                  triggerHaptic();
                  setDuration(opt.value);
                }}
              >
                <Text
                  style={[
                    styles.durationText,
                    duration === opt.value && styles.durationTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 4)}>
        <SectionCard title="Формат" style={styles.sectionCard}>
          <View style={styles.formatRow}>
            {(["ice", "gym", "online"] as const).map((f) => (
              <Pressable
                key={f}
                style={({ pressed }) => [
                  styles.formatChip,
                  format === f && styles.formatChipActive,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={() => {
                  triggerHaptic();
                  setFormat(f);
                }}
              >
                <Ionicons
                  name={FORMAT_ICONS[f]}
                  size={18}
                  color={format === f ? colors.accent : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.formatText,
                    format === f && styles.formatTextActive,
                  ]}
                >
                  {FORMAT_LABELS[f]}
                </Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 5)}>
        <SectionCard title="Заметка для тренера (опционально)" style={styles.sectionCard}>
          <TextInput
            style={styles.noteInput}
            placeholder="Особые пожелания, тема тренировки..."
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
          />
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 6)}>
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            !canContinue && styles.ctaDisabled,
            canContinue && pressed && { opacity: PRESSED_OPACITY },
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.ctaText}>Продолжить к оплате</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.bgDeep} />
        </Pressable>
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
    borderBottomColor: colors.surfaceLevel1Border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", lineHeight: 22, color: colors.text },
  headerBtn: { width: 40, height: 40 },

  paddedContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  skeletonContent: { gap: spacing.xl },
  skeletonCard: { borderRadius: radius.lg },
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
  durationRow: { flexDirection: "row", gap: spacing.md },
  durationChip: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    alignItems: "center",
  },
  durationChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
  },
  durationText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  durationTextActive: {
    color: colors.accent,
  },
  formatRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  formatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  formatChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
  },
  formatText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  formatTextActive: {
    color: colors.accent,
  },
  noteInput: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.sm,
    padding: spacing.lg,
    ...typography.bodySmall,
    color: colors.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    ...typography.body,
    fontWeight: "800",
    color: colors.bgDeep,
  },
});
