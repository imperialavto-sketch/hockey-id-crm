import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getPlayers } from "@/services/playerService";
import { getPlayerSchedule } from "@/services/scheduleService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { ScheduleItemRow } from "@/components/player-passport";
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
      <SkeletonBlock height={180} style={styles.skeletonCard} />
      <SkeletonBlock height={220} style={styles.skeletonCard} />
    </View>
  );
}

export default function ScheduleScreen() {
  const { user } = useAuth();
  const mountedRef = useRef(true);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const players = await getPlayers(user.id);
      const playerId = players[0]?.id;
      if (!mountedRef.current) return;
      if (!playerId) {
        setSchedule([]);
        return;
      }
      const data = await getPlayerSchedule(playerId, user.id);
      if (mountedRef.current) setSchedule(data);
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
  const rest = schedule.filter((s) => !today.includes(s));

  if (!hasContent) {
    return (
      <FlagshipScreen>
        <Animated.View entering={screenReveal(0)}>
          <View style={styles.heroSection}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="calendar-outline" size={32} color={colors.accent} />
            </View>
            <Text style={styles.heroTitle}>Расписание</Text>
            <Text style={styles.heroSub}>
              Тренер может отправлять изменения в приложение
            </Text>
          </View>
        </Animated.View>
        <Animated.View entering={screenReveal(STAGGER)}>
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Пока нет расписания</Text>
            <Text style={styles.emptySub}>
              Когда тренер добавит тренировки и игры, они появятся здесь.
            </Text>
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
            <Ionicons name="calendar-outline" size={32} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Расписание</Text>
          <Text style={styles.heroSub}>
            Тренер может отправлять изменения в приложение
          </Text>
        </View>
      </Animated.View>

      {today.length > 0 && (
        <Animated.View entering={screenReveal(STAGGER)}>
          <SectionCard title="Ближайшие" style={styles.sectionCard}>
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
        <Animated.View entering={screenReveal(STAGGER * 2)}>
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
  skeletonContent: { gap: spacing.xl },
  skeletonHeader: { borderRadius: radius.lg, marginBottom: spacing.sm },
  skeletonCard: { borderRadius: 20 },

  errorWrap: { flex: 1 },
  heroSection: {
    marginBottom: spacing.xl,
    paddingVertical: spacing.xl,
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
    ...typography.sectionTitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  heroSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  emptyCard: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  sectionCard: {
    marginBottom: spacing.xl,
    borderColor: colors.surfaceLevel1Border,
  },
});
