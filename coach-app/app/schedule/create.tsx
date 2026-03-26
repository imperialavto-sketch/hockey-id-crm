import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { getCoachTeams, type CoachTeamItem } from "@/services/coachTeamsService";
import {
  getGroups,
  createTraining,
  type TeamGroup,
  type CreateTrainingPayload,
} from "@/services/coachScheduleService";
import { isAuthRequiredError } from "@/lib/coachAuth";
import { normalizeWeekStartDateParam } from "@/lib/scheduleWeekUtc";
import { ApiRequestError } from "@/lib/api";
import { theme } from "@/constants/theme";

const TRAINING_KINDS: Array<{ value: CreateTrainingPayload["type"]; label: string }> = [
  { value: "ice", label: "Лёд" },
  { value: "ofp", label: "ОФП" },
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toTimeStr(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

function parseDate(dateStr: string): Date | null {
  const d = new Date(dateStr + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function parseTime(timeStr: string): { h: number; m: number } | null {
  const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function buildISO(dateStr: string, timeStr: string): string | null {
  const date = parseDate(dateStr);
  const time = parseTime(timeStr);
  if (!date || !time) return null;
  const d = new Date(date);
  d.setHours(time.h, time.m, 0, 0);
  return d.toISOString();
}

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  return `${weekStart.getDate()}.${String(weekStart.getMonth() + 1).padStart(2, "0")} – ${end.getDate()}.${String(end.getMonth() + 1).padStart(2, "0")}`;
}

function getWeekDays(weekStart: Date): Array<{ date: Date; label: string; key: string }> {
  const days: Array<{ date: Date; label: string; key: string }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push({
      date: d,
      label: `${WEEKDAY_LABELS[i]} ${d.getDate()}`,
      key: toDateStr(d),
    });
  }
  return days;
}

export default function CreateTrainingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ weekStartDate?: string }>();
  const today = new Date();
  const initialWeekStart = params.weekStartDate
    ? (() => {
        const norm =
          normalizeWeekStartDateParam(params.weekStartDate) ?? params.weekStartDate;
        const parsed = new Date(norm + "T12:00:00");
        return Number.isNaN(parsed.getTime()) ? getWeekStart(today) : getWeekStart(parsed);
      })()
    : getWeekStart(today);
  const weekDays = getWeekDays(initialWeekStart);
  const defaultDateStr = toDateStr(initialWeekStart);

  const [teams, setTeams] = useState<CoachTeamItem[]>([]);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [teamId, setTeamId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [type, setType] = useState<CreateTrainingPayload["type"]>("ice");
  const [dateStr, setDateStr] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:30");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [teamsLoading, setTeamsLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getCoachTeams()
      .then((data) => {
        setTeams(data);
        if (data.length > 0 && !teamId) setTeamId(data[0].id);
      })
      .catch(() => setTeams([]))
      .finally(() => setTeamsLoading(false));
  }, []);

  useEffect(() => {
    if (!teamId) {
      setGroups([]);
      setGroupId("");
      return;
    }
    setGroupsLoading(true);
    getGroups(teamId)
      .then((data) => {
        setGroups(data);
        setGroupId(data[0]?.id ?? "");
      })
      .catch(() => {
        setGroups([]);
        setGroupId("");
      })
      .finally(() => setGroupsLoading(false));
  }, [teamId]);

  const validate = useCallback((): boolean => {
    const err: Record<string, string> = {};
    if (!teamId) err.teamId = "Выберите команду";
    if (!groupId) err.groupId = "Выберите группу";
    if (!dateStr) err.dateStr = "Укажите дату";
    else if (!parseDate(dateStr)) err.dateStr = "Неверный формат даты (YYYY-MM-DD)";
    if (!startTime) err.startTime = "Укажите время начала";
    else if (!parseTime(startTime)) err.startTime = "Неверный формат (HH:mm)";
    if (!endTime) err.endTime = "Укажите время окончания";
    else if (!parseTime(endTime)) err.endTime = "Неверный формат (HH:mm)";

    const startISO = buildISO(dateStr, startTime);
    const endISO = buildISO(dateStr, endTime);
    if (startISO && endISO && new Date(endISO).getTime() <= new Date(startISO).getTime()) {
      err.endTime = "Время окончания должно быть позже начала";
    }

    setFieldErrors(err);
    setError(Object.keys(err).length > 0 ? "Заполните обязательные поля" : null);
    return Object.keys(err).length === 0;
  }, [teamId, groupId, dateStr, startTime, endTime]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setSubmitLoading(true);
    setError(null);

    const startAt = buildISO(dateStr, startTime);
    const endAt = buildISO(dateStr, endTime);
    if (!startAt || !endAt) {
      setError("Неверные дата или время");
      setSubmitLoading(false);
      return;
    }

    const payload: CreateTrainingPayload = {
      teamId,
      groupId,
      type,
      startAt,
      endAt,
      locationName: locationName.trim() || null,
      locationAddress: locationAddress.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      await createTraining(payload);
      router.replace("/schedule");
    } catch (err) {
      if (isAuthRequiredError(err)) {
        setError("Требуется авторизация");
      } else if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Ошибка создания");
      }
    } finally {
      setSubmitLoading(false);
    }
  }, [teamId, groupId, type, dateStr, startTime, endTime, locationName, locationAddress, notes, validate, router]);

  if (teamsLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (teams.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Нет доступных команд</Text>
          <PrimaryButton title="Назад" variant="outline" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionCard>
            <Text style={styles.label}>Команда</Text>
            <View style={styles.chipRow}>
              {teams.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setTeamId(t.id)}
                  style={[styles.chip, teamId === t.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, teamId === t.id && styles.chipTextActive]}>
                    {t.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            {fieldErrors.teamId ? (
              <Text style={styles.fieldError}>{fieldErrors.teamId}</Text>
            ) : null}
          </SectionCard>

          <SectionCard>
            <Text style={styles.label}>Группа</Text>
            {groupsLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <View style={styles.chipRow}>
                {groups.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => setGroupId(g.id)}
                    style={[styles.chip, groupId === g.id && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, groupId === g.id && styles.chipTextActive]}>
                      {g.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {fieldErrors.groupId ? (
              <Text style={styles.fieldError}>{fieldErrors.groupId}</Text>
            ) : null}
          </SectionCard>

          <SectionCard>
            <Text style={styles.label}>Тип тренировки</Text>
            <View style={styles.chipRow}>
              {TRAINING_KINDS.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setType(t.value)}
                  style={[styles.chip, type === t.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.label}>День недели *</Text>
            <Text style={styles.weekHint}>
              {formatWeekRange(initialWeekStart)}
            </Text>
            <View style={styles.chipRow}>
              {weekDays.map((day) => (
                <Pressable
                  key={day.key}
                  onPress={() => setDateStr(day.key)}
                  style={[styles.chip, dateStr === day.key && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      dateStr === day.key && styles.chipTextActive,
                    ]}
                  >
                    {day.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {fieldErrors.dateStr ? (
              <Text style={styles.fieldError}>{fieldErrors.dateStr}</Text>
            ) : null}
          </SectionCard>

          <SectionCard>
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Начало (HH:mm) *</Text>
                <TextInput
                  style={[styles.input, fieldErrors.startTime && styles.inputError]}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="18:00"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                />
                {fieldErrors.startTime ? (
                  <Text style={styles.fieldError}>{fieldErrors.startTime}</Text>
                ) : null}
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Конец (HH:mm) *</Text>
                <TextInput
                  style={[styles.input, fieldErrors.endTime && styles.inputError]}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="19:30"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                />
                {fieldErrors.endTime ? (
                  <Text style={styles.fieldError}>{fieldErrors.endTime}</Text>
                ) : null}
              </View>
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.label}>Место проведения</Text>
            <TextInput
              style={styles.input}
              value={locationName}
              onChangeText={setLocationName}
              placeholder="Ледовая арена «Север»"
              placeholderTextColor={theme.colors.textMuted}
            />
          </SectionCard>

          <SectionCard>
            <Text style={styles.label}>Адрес (необязательно)</Text>
            <TextInput
              style={styles.input}
              value={locationAddress}
              onChangeText={setLocationAddress}
              placeholder="ул. Примерная, 1"
              placeholderTextColor={theme.colors.textMuted}
            />
          </SectionCard>

          <SectionCard>
            <Text style={styles.label}>Заметки (необязательно)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Дополнительная информация"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </SectionCard>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <PrimaryButton
            title={submitLoading ? "Создание…" : "Создать тренировку"}
            onPress={handleSubmit}
            disabled={submitLoading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
  },
  chipActive: {
    backgroundColor: theme.colors.primaryMuted,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  weekHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  half: { flex: 1 },
  fieldError: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  error: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  submitBtn: { marginTop: theme.spacing.sm },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.lg,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
