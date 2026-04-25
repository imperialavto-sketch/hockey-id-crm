import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import Animated from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import {
  getPlayers,
  getLatestTrainingSummaryForPlayer,
  type ParentLiveTrainingHeroPayload,
} from "@/services/playerService";
import { getMeSchedule } from "@/services/scheduleService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { ScheduleItemRow } from "@/components/player-passport";
import { SkeletonBlock, ErrorStateView } from "@/components/ui";
import { ParentLiveTrainingHeroBlock } from "@/components/live-training/ParentLiveTrainingHeroBlock";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { ScheduleItem, Player } from "@/types";
import {
  SCHEDULE_COPY,
  formatScheduleWeekLabel,
} from "@/lib/parentScheduleUi";

const PRESSED_OPACITY = 0.88;
const SECTION_GAP = spacing.lg;

const EMPTY_LIVE_TRAINING_HERO: ParentLiveTrainingHeroPayload = {
  summary: null,
  guidance: null,
  fallbackLine: null,
  provenanceLine: null,
};

function weekStartMondayLocal(d = new Date()): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  const y = m.getFullYear();
  const mo = String(m.getMonth() + 1).padStart(2, "0");
  const da = String(m.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

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

type ScheduleHeaderProps = {
  subtitle: string;
  weekStart: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  players: Player[];
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string) => void;
};

function ScheduleHeader({
  subtitle,
  weekStart,
  onPrevWeek,
  onNextWeek,
  players,
  selectedPlayerId,
  onSelectPlayer,
}: ScheduleHeaderProps) {
  const weekHuman = formatScheduleWeekLabel(weekStart);
  return (
    <View style={styles.heroSection}>
      <View style={styles.heroIconWrap}>
        <Ionicons name="calendar-outline" size={26} color={colors.accent} />
      </View>
      <Text style={styles.heroTitle}>{SCHEDULE_COPY.heroTitle}</Text>
      <Text style={styles.heroSub}>{subtitle}</Text>
      <View style={styles.weekRow}>
        <Pressable
          onPress={() => {
            triggerHaptic();
            onPrevWeek();
          }}
          style={({ pressed }) => [styles.weekNavBtn, pressed && { opacity: PRESSED_OPACITY }]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
        </Pressable>
        <Text style={styles.weekLabel} numberOfLines={2}>
          Неделя с {weekHuman}
        </Text>
        <Pressable
          onPress={() => {
            triggerHaptic();
            onNextWeek();
          }}
          style={({ pressed }) => [styles.weekNavBtn, pressed && { opacity: PRESSED_OPACITY }]}
          hitSlop={12}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.accent} />
        </Pressable>
      </View>
      {players.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.playerChipsScroll}
          contentContainerStyle={styles.playerChipsRow}
        >
          {players.map((p) => {
            const active = (selectedPlayerId ?? players[0]?.id) === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  triggerHaptic();
                  onSelectPlayer(p.id);
                }}
                style={({ pressed }) => [
                  styles.playerChip,
                  active && styles.playerChipActive,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
              >
                <Text
                  style={[styles.playerChipText, active && styles.playerChipTextActive]}
                  numberOfLines={1}
                >
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

export default function ScheduleScreen() {
  const { user } = useAuth();
  const mountedRef = useRef(true);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => weekStartMondayLocal());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [liveTrainingHero, setLiveTrainingHero] =
    useState<ParentLiveTrainingHeroPayload>(EMPTY_LIVE_TRAINING_HERO);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const goPrevWeek = useCallback(() => {
    const [y, m, d] = weekStart.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 7);
    setWeekStart(weekStartMondayLocal(dt));
  }, [weekStart]);

  const goNextWeek = useCallback(() => {
    const [y, m, d] = weekStart.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 7);
    setWeekStart(weekStartMondayLocal(dt));
  }, [weekStart]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setSchedule([]);
      setLiveTrainingHero(EMPTY_LIVE_TRAINING_HERO);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const playersData = await getPlayers(user.id).catch(() => []);
      if (!mountedRef.current) return;
      const list = Array.isArray(playersData) ? playersData : [];
      setPlayers(list);
      const pid =
        selectedPlayerId && list.some((p) => p.id === selectedPlayerId)
          ? selectedPlayerId
          : list[0]?.id ?? null;
      const scheduleData = await getMeSchedule(pid, weekStart);
      if (!mountedRef.current) return;
      if (mountedRef.current) {
        setSchedule(Array.isArray(scheduleData) ? scheduleData : []);
      }
      if (pid) {
        const hero = await getLatestTrainingSummaryForPlayer(pid);
        if (!mountedRef.current) return;
        setLiveTrainingHero(hero);
      } else if (mountedRef.current) {
        setLiveTrainingHero(EMPTY_LIVE_TRAINING_HERO);
      }
    } catch {
      if (mountedRef.current) {
        setSchedule([]);
        setLiveTrainingHero(EMPTY_LIVE_TRAINING_HERO);
        setError(true);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id, selectedPlayerId, weekStart]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const effectivePlayerId = useMemo(
    () => selectedPlayerId ?? players[0]?.id ?? null,
    [selectedPlayerId, players]
  );

  const headerProps = useMemo(
    () => ({
      weekStart,
      onPrevWeek: goPrevWeek,
      onNextWeek: goNextWeek,
      players,
      selectedPlayerId,
      onSelectPlayer: setSelectedPlayerId,
    }),
    [weekStart, goPrevWeek, goNextWeek, players, selectedPlayerId]
  );

  if (loading) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingHint}>{SCHEDULE_COPY.loadingHint}</Text>
          <ScheduleSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.errorWrap}>
          <ErrorStateView
            variant="network"
            title={SCHEDULE_COPY.loadErrorTitle}
            subtitle={SCHEDULE_COPY.loadErrorSubtitle}
            onAction={load}
          />
        </View>
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
          <ScheduleHeader
            {...headerProps}
            subtitle={SCHEDULE_COPY.heroSubEmpty}
          />
        </Animated.View>
        <Animated.View entering={screenReveal(STAGGER)}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={30} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>{SCHEDULE_COPY.emptyTitle}</Text>
            <Text style={styles.emptySub}>{SCHEDULE_COPY.emptySub}</Text>
            <View style={styles.arenaTrainingBlockInEmpty}>
              <ParentLiveTrainingHeroBlock
                summary={liveTrainingHero.summary}
                guidance={liveTrainingHero.guidance}
                fallbackLine={liveTrainingHero.fallbackLine}
                provenanceLine={liveTrainingHero.provenanceLine}
              />
            </View>
          </View>
        </Animated.View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen>
      <Animated.View entering={screenReveal(0)}>
        <ScheduleHeader {...headerProps} subtitle={SCHEDULE_COPY.heroSubWithSchedule} />
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER)}>
        <View style={styles.arenaTrainingBlockBelowHeader}>
          <ParentLiveTrainingHeroBlock
            summary={liveTrainingHero.summary}
            guidance={liveTrainingHero.guidance}
            fallbackLine={liveTrainingHero.fallbackLine}
            provenanceLine={liveTrainingHero.provenanceLine}
          />
        </View>
      </Animated.View>

      {today.length > 0 && (
        <Animated.View entering={screenReveal(STAGGER * 2)}>
          <SectionCard title={SCHEDULE_COPY.sectionUpcoming} variant="primary" style={styles.sectionCard}>
            {today.map((item, index) => (
              <ScheduleItemRow
                key={item.id}
                day={item.day}
                title={item.title}
                time={item.time}
                subtitle={item.subtitle}
                attendance={item.attendance}
                isLast={index === today.length - 1}
              />
            ))}
          </SectionCard>
        </Animated.View>
      )}

      {rest.length > 0 && (
        <Animated.View entering={screenReveal(STAGGER * 3)}>
          <SectionCard title={SCHEDULE_COPY.sectionWeek} style={styles.sectionCard}>
            {rest.map((item, index) => (
              <ScheduleItemRow
                key={item.id}
                day={item.day}
                title={item.title}
                time={item.time}
                subtitle={item.subtitle}
                attendance={item.attendance}
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
  loadingWrap: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  loadingHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    letterSpacing: 0.15,
  },
  skeletonContent: { gap: SECTION_GAP },
  skeletonHeader: { borderRadius: radius.lg },
  skeletonCta: { borderRadius: radius.md },
  skeletonCard: { borderRadius: radius.lg },

  errorWrap: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
  },

  heroSection: {
    marginBottom: SECTION_GAP,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLevel2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel2Border,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  heroSub: {
    ...typography.caption,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  emptyCard: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel1Border,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceLevel2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel2Border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.section,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  arenaTrainingBlockInEmpty: {
    width: "100%",
    marginTop: spacing.lg,
  },
  arenaTrainingBlockBelowHeader: {
    width: "100%",
    marginBottom: SECTION_GAP,
  },

  sectionCard: {
    marginBottom: SECTION_GAP,
    borderColor: colors.surfaceLevel1Border,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  weekNavBtn: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  weekLabel: {
    ...typography.caption,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
    textAlign: "center",
    minWidth: 0,
  },
  playerChipsScroll: { marginTop: spacing.md, maxHeight: 44 },
  playerChipsRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  playerChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLevel2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel2Border,
    marginRight: spacing.sm,
  },
  playerChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  playerChipText: { ...typography.caption, color: colors.textSecondary },
  playerChipTextActive: { color: colors.accent, fontWeight: "600" },
});
