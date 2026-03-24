import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCoachTeams, type CoachTeamItem } from "@/services/coachTeamsService";
import { getScheduleForWeek, type ScheduleItem } from "@/services/coachScheduleService";
import { isAuthRequiredError } from "@/lib/coachAuth";
import { theme } from "@/constants/theme";

const TYPE_LABELS: Record<string, string> = {
  hockey: "Хоккей",
  ofp: "ОФП",
  game: "Игра",
  individual: "Индивидуалка",
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

function groupSessionsByDay(sessions: ScheduleItem[]): Map<string, ScheduleItem[]> {
  const map = new Map<string, ScheduleItem[]>();
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

function SessionCard({ item }: { item: ScheduleItem }) {
  const typeLabel = TYPE_LABELS[item.type] ?? item.type;
  return (
    <View style={styles.sessionCard}>
      <Text style={styles.sessionTimeText}>
        {formatTime(item.startAt)} – {formatTime(item.endAt)}
      </Text>
      <View style={styles.sessionBody}>
        <Text style={styles.sessionTitle}>
          {item.group.name} • {typeLabel}
        </Text>
        {item.locationName ? (
          <Text style={styles.sessionLocation} numberOfLines={1}>
            {item.locationName}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ScheduleScreen() {
  const router = useRouter();
  const [teams, setTeams] = useState<CoachTeamItem[]>([]);
  const [sessions, setSessions] = useState<ScheduleItem[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      let cancelled = false;
      getCoachTeams()
        .then((teamList) => {
          if (cancelled) return null;
          setTeams(teamList);
          const tid =
            selectedTeamId && teamList.some((t) => t.id === selectedTeamId)
              ? selectedTeamId
              : teamList[0]?.id ?? null;
          if (tid && !selectedTeamId) setSelectedTeamId(tid);
          return tid;
        })
        .then((tid) => {
          if (cancelled || !tid) {
            setSessions([]);
            return;
          }
          return getScheduleForWeek(toDateStr(weekStart), tid).then((sched) => {
            if (!cancelled) setSessions(Array.isArray(sched) ? sched : []);
          });
        })
        .catch((err) => {
          if (!cancelled) {
            setSessions([]);
            setError(
              isAuthRequiredError(err)
                ? "Требуется авторизация"
                : err instanceof Error
                  ? err.message
                  : "Не удалось загрузить расписание"
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [weekStart, selectedTeamId])
  );

  const prevWeek = () => setWeekStart(getPrevWeek(weekStart));
  const nextWeek = () => setWeekStart(getNextWeek(weekStart));

  const effectiveTeamId = selectedTeamId ?? teams[0]?.id ?? null;
  const byDay = groupSessionsByDay(sessions);
  const weekDays = getWeekDays(weekStart);

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
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
          <Text style={styles.teamLabel}>Команда: </Text>
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
        <SectionCard>
          <Text style={styles.errorText}>{error}</Text>
        </SectionCard>
      ) : loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : !effectiveTeamId ? (
        <EmptyState
          title="Нет доступных команд"
          subtitle="Добавьте команду в CRM"
          icon="👥"
        />
      ) : (
        <>
          <PrimaryButton
            title="+ Новая тренировка"
            onPress={() =>
              router.push({
                pathname: "/schedule/create",
                params: { weekStartDate: toDateStr(weekStart) },
              })
            }
            style={styles.createBtn}
          />
          {sessions.length === 0 ? (
            <EmptyState
              title="Нет тренировок на неделю"
              subtitle={formatWeekRange(weekStart)}
              icon="📅"
              action={{
                label: "Создать",
                onPress: () =>
                  router.push({
                    pathname: "/schedule/create",
                    params: { weekStartDate: toDateStr(weekStart) },
                  }),
              }}
            />
          ) : (
            <ScrollView style={styles.weekScroll} showsVerticalScrollIndicator={false}>
              {weekDays.map((day) => {
                const key = getDayKey(day);
                const daySessions = byDay.get(key) ?? [];
                return (
                  <View key={key} style={styles.daySection}>
                    <Text style={styles.dayHeader}>
                      {WEEKDAY_LABELS[(day.getDay() + 6) % 7]} {day.getDate()}
                    </Text>
                    {daySessions.length === 0 ? (
                      <Text style={styles.dayEmpty}>—</Text>
                    ) : (
                      daySessions.map((s) => (
                        <SessionCard key={s.id} item={s} />
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
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
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
  teamLabel: { ...theme.typography.caption, color: theme.colors.textSecondary },
  teamChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    marginRight: theme.spacing.sm,
  },
  teamChipActive: { backgroundColor: theme.colors.primaryMuted },
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
  sessionCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.sm,
  },
  sessionTimeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
    minWidth: 90,
  },
  sessionBody: { flex: 1 },
  sessionTitle: { ...theme.typography.body, color: theme.colors.text },
  sessionLocation: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  loading: {
    paddingVertical: theme.spacing.xxl,
    alignItems: "center",
  },
  errorText: { ...theme.typography.body, color: theme.colors.error },
});
