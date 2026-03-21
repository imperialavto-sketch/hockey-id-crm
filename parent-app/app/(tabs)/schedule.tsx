import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { COACH_MARK_ID } from "@/services/chatService";
import { getPlayers } from "@/services/playerService";
import { getMeSchedule } from "@/services/scheduleService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { ScheduleItemRow } from "@/components/player-passport";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { SkeletonBlock, ErrorStateView } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

type ScheduleItem = { id: string; day: string; title: string; time: string };

function ScheduleSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={100} style={styles.skeletonHeader} />
      <SkeletonBlock height={56} style={styles.skeletonCta} />
      <SkeletonBlock height={180} style={styles.skeletonCard} />
      <SkeletonBlock height={220} style={styles.skeletonCard} />
    </View>
  );
}

const SECTION_GAP = 24;

export default function ScheduleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const mountedRef = useRef(true);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async () => {
    if (!user?.id) {
      setSchedule([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const [scheduleData, playersData] = await Promise.all([
        getMeSchedule(),
        getPlayers(user.id).catch(() => []),
      ]);
      if (!mountedRef.current) return;
      if (mountedRef.current) {
        setSchedule(Array.isArray(scheduleData) ? scheduleData : []);
        setPlayerId(playersData?.[0]?.id ?? null);
      }
    } catch {
      if (mountedRef.current) {
        setSchedule([]);
        setError(true);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <FlagshipScreen>
        <ScheduleSkeleton />
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen scroll={false}>
        <ErrorStateView
          variant="network"
          title="Не удалось загрузить расписание"
          subtitle="Проверьте подключение и попробуйте снова"
          onAction={load}
          style={styles.errorWrap}
        />
      </FlagshipScreen>
    );
  }

  const hasContent = schedule.length > 0;
  const today = schedule.filter((s) => s.title !== "Выходной").slice(0, 3);
  const todayIds = new Set(today.map((t) => t.id));
  const rest = schedule.filter((s) => !todayIds.has(s.id));

  if (!hasContent) {
    return (
      <FlagshipScreen>
        <Animated.View entering={screenReveal(0)}>
          <View style={styles.heroSection}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="calendar-outline" size={28} color={colors.accent} />
            </View>
            <Text style={styles.heroTitle}>Расписание</Text>
            <Text style={styles.heroSub}>
              Тренер может отправлять изменения в приложение
            </Text>
          </View>
        </Animated.View>
        <Animated.View entering={screenReveal(STAGGER)}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Пока нет расписания</Text>
            <Text style={styles.emptySub}>
              Когда тренер добавит тренировки и игры, они появятся здесь.
            </Text>
            <View style={styles.emptyCoachMarkWrap}>
              <ActionLinkCard
                icon="sparkles"
                title="Coach Mark"
                description="Составь план на эту неделю. Обновляй каждую неделю"
                onPress={() => {
                  triggerHaptic();
                  const q = playerId
                    ? `?playerId=${encodeURIComponent(playerId)}&initialMessage=${encodeURIComponent("Составь персональный план тренировок на неделю с учётом расписания")}`
                    : "";
                  router.push(`/chat/${COACH_MARK_ID}${q}` as never);
                }}
                variant="accent"
              />
            </View>
          </View>
        </Animated.View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen>
      {/* Hero header */}
      <Animated.View entering={screenReveal(0)}>
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="calendar-outline" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Расписание</Text>
          <Text style={styles.heroSub}>
            Проверяйте расписание — тренер может обновлять тренировки и игры
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER)}>
        <ActionLinkCard
          icon="sparkles"
          title="Coach Mark"
          description="Составь план на эту неделю. Обновляй каждую неделю"
          onPress={() => {
            triggerHaptic();
            const q = playerId
              ? `?playerId=${encodeURIComponent(playerId)}&initialMessage=${encodeURIComponent("Составь персональный план тренировок на неделю с учётом расписания")}`
              : "";
            router.push(`/chat/${COACH_MARK_ID}${q}` as never);
          }}
          variant="accent"
        />
      </Animated.View>

      {today.length > 0 && (
        <Animated.View entering={screenReveal(STAGGER * 2)}>
          <SectionCard title="Ближайшие" variant="primary" style={styles.sectionCard}>
            {today.map((item, index) => (
              <ScheduleItemRow
                key={item.id}
                day={item.day}
                title={item.title}
                time={item.time}
                isLast={index === today.length - 1}
              />
            ))}
          </SectionCard>
        </Animated.View>
      )}

      {rest.length > 0 && (
        <Animated.View entering={screenReveal(STAGGER * 3)}>
          <SectionCard title="На неделе" style={styles.sectionCard}>
            {rest.map((item, index) => (
              <ScheduleItemRow
                key={item.id}
                day={item.day}
                title={item.title}
                time={item.time}
                isLast={index === rest.length - 1}
                muted={item.title === "Выходной"}
              />
            ))}
          </SectionCard>
        </Animated.View>
      )}
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  skeletonContent: { gap: SECTION_GAP },
  skeletonHeader: { borderRadius: radius.lg },
  skeletonCta: { borderRadius: radius.md },
  skeletonCard: { borderRadius: radius.lg },

  errorWrap: { flex: 1 },
  heroSection: {
    marginBottom: SECTION_GAP,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLevel2,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  heroSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  emptyCard: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceLevel2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.section,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyCoachMarkWrap: {
    width: "100%",
    marginTop: spacing.lg,
  },

  sectionCard: {
    marginBottom: SECTION_GAP,
    borderColor: colors.surfaceLevel1Border,
  },
});
