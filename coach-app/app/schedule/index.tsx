import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCoachTeams, type CoachTeamItem } from "@/services/coachTeamsService";
import {
  getCoachScheduleWeek,
  type CoachTrainingSession,
} from "@/services/coachScheduleService";
import { weekStartParamFromLocalMonday } from "@/lib/scheduleWeekUtc";
import { isAuthRequiredError } from "@/lib/coachAuth";
import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import {
  COACH_SCHEDULE_AUTH_LINE,
  COACH_SCHEDULE_COPY,
} from "@/lib/coachScheduleUi";

const TYPE_LABELS: Record<string, string> = {
  ice: "Лёд",
  ofp: "ОФП",
  hockey: "Лёд",
  game: "Лёд",
  individual: "Лёд",
};

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday 00:00 local as week start */
function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getPrevWeek(weekStart: Date): Date {
  const prev = new Date(weekStart);
  prev.setDate(prev.getDate() - 7);
  return prev;
}

function getNextWeek(weekStart: Date): Date {
  const next = new Date(weekStart);
  next.setDate(next.getDate() + 7);
  return next;
}

function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  const a = weekStart.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const b = end.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  return `${a} – ${b}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDayKey(d: Date): string {
  return toDateStr(d);
}

function groupSessionsByDay(
  sessions: CoachTrainingSession[]
): Map<string, CoachTrainingSession[]> {
  const map = new Map<string, CoachTrainingSession[]>();
  for (const s of sessions) {
    const d = new Date(s.startAt);
    const key = toDateStr(d);
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }
  return map;
}

function SessionCard({
  item,
  onPress,
}: {
  item: CoachTrainingSession;
  onPress?: () => void;
}) {
  const typeLabel = TYPE_LABELS[item.type] ?? item.type;
  const sub = item.subType?.trim();
  const kindLine = sub ? `${typeLabel} · ${sub}` : typeLabel;
  const inner = (
    <>
      <View style={styles.sessionAccent} />
      <Text style={styles.sessionTimeText}>
        {formatTime(item.startAt)} – {formatTime(item.endAt)}
      </Text>
      <View style={styles.sessionBody}>
        <Text style={styles.sessionTitle}>
          {item.teamName} · {item.group.name} • {kindLine}
        </Text>
        {item.locationName ? (
          <Text style={styles.sessionLocation} numberOfLines={1}>
            {item.locationName}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      ) : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.sessionCard,
          pressed && styles.sessionCardPressed,
        ]}
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.sessionCard}>{inner}</View>;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const [teams, setTeams] = useState<CoachTeamItem[]>([]);
  const [sessions, setSessions] = useState<CoachTrainingSession[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const teamList = await getCoachTeams();
      setTeams(teamList);
      const tid =
        selectedTeamId && teamList.some((t) => t.id === selectedTeamId)
          ? selectedTeamId
          : teamList[0]?.id ?? null;
      if (tid && !selectedTeamId) setSelectedTeamId(tid);
      if (!tid) {
        setSessions([]);
        return;
      }
      const sched = await getCoachScheduleWeek(
        weekStartParamFromLocalMonday(weekStart),
        tid
      );
      setSessions(Array.isArray(sched) ? sched : []);
    } catch (err) {
      setSessions([]);
      setError(
        isAuthRequiredError(err)
          ? COACH_SCHEDULE_AUTH_LINE
          : err instanceof Error
            ? err.message
            : COACH_SCHEDULE_COPY.loadErrorFallback
      );
    }
  }, [weekStart, selectedTeamId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void (async () => {
        await reload();
        if (!cancelled) setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [reload])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const prevWeek = () => setWeekStart(getPrevWeek(weekStart));
  const nextWeek = () => setWeekStart(getNextWeek(weekStart));

  const effectiveTeamId = selectedTeamId ?? teams[0]?.id ?? null;
  const byDay = groupSessionsByDay(sessions);
  const weekDays = getWeekDays(weekStart);

  const todayStr = toDateStr(new Date());
  const tomorrowD = new Date();
  tomorrowD.setDate(tomorrowD.getDate() + 1);
  const tomorrowStr = toDateStr(tomorrowD);
  const todaySessions = sessions.filter(
    (s) => toDateStr(new Date(s.startAt)) === todayStr
  );
  const tomorrowSessions = sessions.filter(
    (s) => toDateStr(new Date(s.startAt)) === tomorrowStr
  );

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.heroBlock}>
        <Text style={styles.heroEyebrow}>{COACH_SCHEDULE_COPY.heroEyebrow}</Text>
        <Text style={styles.heroHint}>{COACH_SCHEDULE_COPY.heroHint}</Text>
      </View>
      <View style={styles.weekRow}>
        <Pressable
          onPress={prevWeek}
          style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
        >
          <SymbolView
            name={{ ios: "chevron.left", android: "chevron_left", web: "chevron_left" } as any}
            tintColor={theme.colors.primary}
            size={24}
          />
        </Pressable>
        <Text style={styles.weekLabel}>{formatWeekRange(weekStart)}</Text>
        <Pressable
          onPress={nextWeek}
          style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
        >
          <SymbolView
            name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" } as any}
            tintColor={theme.colors.primary}
            size={24}
          />
        </Pressable>
      </View>

      {teams.length > 1 && (
        <View style={styles.teamRow}>
          <Text style={styles.teamLabel}>{COACH_SCHEDULE_COPY.teamPickerLabel} </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {teams.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setSelectedTeamId(t.id)}
                style={[styles.teamChip, selectedTeamId === t.id && styles.teamChipActive]}
              >
                <Text
                  style={[
                    styles.teamChipText,
                    selectedTeamId === t.id && styles.teamChipTextActive,
                  ]}
                >
                  {t.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {error ? (
        <SectionCard elevated style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          {error !== COACH_SCHEDULE_AUTH_LINE ? (
            <Text style={styles.errorHint}>{COACH_SCHEDULE_COPY.networkRetryHint}</Text>
          ) : null}
          <PrimaryButton
            title={COACH_SCHEDULE_COPY.retryCta}
            variant="outline"
            onPress={() => {
              setLoading(true);
              void reload().finally(() => setLoading(false));
            }}
            style={styles.errorRetryBtn}
          />
        </SectionCard>
      ) : loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingHint}>{COACH_SCHEDULE_COPY.loadingHint}</Text>
        </View>
      ) : !effectiveTeamId ? (
        <EmptyState
          title={COACH_SCHEDULE_COPY.noTeamsTitle}
          subtitle={COACH_SCHEDULE_COPY.noTeamsSubtitle}
          icon="👥"
        />
      ) : (
        <>
          <PrimaryButton
            title={COACH_SCHEDULE_COPY.createCta}
            onPress={() =>
              router.push({
                pathname: "/schedule/create",
                params: {
                  weekStartDate: weekStartParamFromLocalMonday(weekStart),
                },
              })
            }
            style={styles.createBtn}
          />

          {(todaySessions.length > 0 || tomorrowSessions.length > 0) && (
            <View style={styles.quickSection}>
              {todaySessions.length > 0 && (
                <SectionCard elevated style={styles.quickCard}>
                  <Text style={styles.quickTitle}>{COACH_SCHEDULE_COPY.quickToday}</Text>
                  {todaySessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      item={s}
                      onPress={() => router.push(`/schedule/${s.id}` as never)}
                    />
                  ))}
                </SectionCard>
              )}
              {tomorrowSessions.length > 0 && (
                <SectionCard elevated style={styles.quickCard}>
                  <Text style={styles.quickTitle}>{COACH_SCHEDULE_COPY.quickTomorrow}</Text>
                  {tomorrowSessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      item={s}
                      onPress={() => router.push(`/schedule/${s.id}` as never)}
                    />
                  ))}
                </SectionCard>
              )}
            </View>
          )}

          {sessions.length === 0 ? (
            <EmptyState
              title={COACH_SCHEDULE_COPY.emptyWeekTitle}
              subtitle={formatWeekRange(weekStart)}
              icon="📅"
              action={{
                label: COACH_SCHEDULE_COPY.emptyWeekAction,
                onPress: () =>
                  router.push({
                    pathname: "/schedule/create",
                    params: {
                  weekStartDate: weekStartParamFromLocalMonday(weekStart),
                },
                  }),
              }}
            />
          ) : (
            <ScrollView
              style={styles.weekScroll}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              <Text style={styles.weekSectionTitle}>{COACH_SCHEDULE_COPY.weekSectionTitle}</Text>
              {weekDays.map((day) => {
                const key = getDayKey(day);
                const daySessions = byDay.get(key) ?? [];
                return (
                  <View key={key} style={styles.daySection}>
                    <Text style={styles.dayHeader}>
                      {WEEKDAY_LABELS[(day.getDay() + 6) % 7]} {day.getDate()}
                    </Text>
                    {daySessions.length === 0 ? (
                      <Text style={styles.dayEmpty}>{COACH_SCHEDULE_COPY.dayFree}</Text>
                    ) : (
                      daySessions.map((s) => (
                        <SessionCard
                          key={s.id}
                          item={s}
                          onPress={() => router.push(`/schedule/${s.id}` as never)}
                        />
                      ))
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  heroBlock: {
    marginBottom: theme.layout.heroBottom,
  },
  heroEyebrow: {
    ...theme.typography.heroEyebrow,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  heroHint: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  navBtn: { padding: theme.spacing.sm },
  navBtnPressed: { opacity: 0.7 },
  weekLabel: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    minWidth: 180,
    textAlign: "center",
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  teamLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginRight: theme.spacing.xs,
  },
  teamChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  teamChipActive: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  teamChipText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  teamChipTextActive: { color: theme.colors.primary, fontWeight: "600" },
  createBtn: { marginBottom: theme.spacing.lg },
  weekScroll: { flex: 1 },
  daySection: {
    marginBottom: theme.spacing.lg,
  },
  dayHeader: {
    ...theme.typography.subtitle,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  dayEmpty: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  quickSection: { gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  quickCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  quickTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  weekSectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    paddingLeft: 0,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.sm,
    overflow: "hidden",
  },
  sessionAccent: {
    width: 4,
    alignSelf: "stretch",
    minHeight: 48,
    backgroundColor: theme.colors.primary,
    opacity: 0.9,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.lg,
  },
  sessionCardPressed: { opacity: 0.88 },
  sessionTimeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
    minWidth: 88,
  },
  sessionBody: { flex: 1, minWidth: 0 },
  sessionTitle: { ...theme.typography.body, color: theme.colors.text },
  sessionLocation: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  loading: {
    paddingVertical: theme.spacing.xxl,
    alignItems: "center",
    gap: theme.spacing.sm,
    flexDirection: "row",
    justifyContent: "center",
  },
  loadingHint: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  errorHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  errorRetryBtn: {
    alignSelf: "flex-start",
  },
});
