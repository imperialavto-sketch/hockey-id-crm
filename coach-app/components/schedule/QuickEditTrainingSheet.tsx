import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  updateTrainingSession,
  deleteTrainingSession,
  type CoachTrainingSession,
} from "@/services/coachScheduleService";
import {
  listCoachTeamGroups,
  type CoachTeamGroupListItem,
} from "@/services/coachTeamGroupsService";
import { ApiRequestError } from "@/lib/api";
import { isAuthRequiredError } from "@/lib/coachAuth";
import {
  buildISO,
  parseTime,
  normalizeScheduleKind,
  isoToLocalDateKey,
  isoToLocalTimeLabel,
} from "@/lib/scheduleSlotForm";
import { COACH_SCHEDULE_COPY } from "@/lib/coachScheduleUi";
import { theme } from "@/constants/theme";
import { coachHapticSuccess, coachHapticLight } from "@/lib/coachHaptics";
import { getActiveLiveTrainingSession } from "@/services/liveTrainingService";
import type { LiveTrainingSession as LtSession } from "@/types/liveTraining";
import { navigateToLiveTrainingFromScheduleSlot } from "@/lib/liveTrainingScheduleRouteContext";

const KINDS: Array<{ value: "ice" | "ofp"; label: string }> = [
  { value: "ice", label: "Лёд" },
  { value: "ofp", label: "ОФП" },
];

export type QuickEditTrainingSheetProps = {
  visible: boolean;
  session: CoachTrainingSession | null;
  /** YYYY-MM-DD понедельника недели (для «Создать похожую»). */
  weekStartDateParam: string;
  onClose: () => void;
  onAfterMutation: () => void | Promise<void>;
  onOpenDetail: (sessionId: string) => void;
};

export function QuickEditTrainingSheet({
  visible,
  session,
  weekStartDateParam,
  onClose,
  onAfterMutation,
  onOpenDetail,
}: QuickEditTrainingSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<CoachTeamGroupListItem[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const [dateStr, setDateStr] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:30");
  const [type, setType] = useState<"ice" | "ofp">("ice");
  const [subType, setSubType] = useState("");
  const [trainingGroupKey, setTrainingGroupKey] = useState<string>("__whole__");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLive, setActiveLive] = useState<LtSession | null>(null);
  const [liveCtaTitle, setLiveCtaTitle] = useState("Начать тренировку");
  const [liveNavBusy, setLiveNavBusy] = useState(false);

  useEffect(() => {
    if (!visible || !session) return;
    setDateStr(isoToLocalDateKey(session.startAt));
    setStartTime(isoToLocalTimeLabel(session.startAt));
    setEndTime(isoToLocalTimeLabel(session.endAt));
    setType(normalizeScheduleKind(session.type));
    setSubType(session.subType?.trim() ?? "");
    setTrainingGroupKey(session.groupId ?? "__whole__");
    setLocationName(session.locationName ?? "");
    setLocationAddress(session.locationAddress ?? "");
    setNotes(session.notes ?? "");
    setError(null);

    setGroupsLoading(true);
    listCoachTeamGroups(session.teamId)
      .then((g) => setGroups(Array.isArray(g) ? g : []))
      .catch(() => setGroups([]))
      .finally(() => setGroupsLoading(false));

    setActiveLive(null);
    setLiveCtaTitle("Начать тренировку");
    void getActiveLiveTrainingSession()
      .then((a) => {
        if (!session) return;
        setActiveLive(a);
        if (
          a &&
          a.teamId === session.teamId &&
          (a.status === "live" || a.status === "review")
        ) {
          setLiveCtaTitle("Продолжить тренировку");
        } else {
          setLiveCtaTitle("Начать тренировку");
        }
      })
      .catch(() => {
        setActiveLive(null);
        setLiveCtaTitle("Начать тренировку");
      });
  }, [visible, session?.id, session]);

  const validate = useCallback((): boolean => {
    if (!dateStr || !parseTime(startTime) || !parseTime(endTime)) {
      setError(COACH_SCHEDULE_COPY.fieldValidationHint);
      return false;
    }
    const startISO = buildISO(dateStr, startTime);
    const endISO = buildISO(dateStr, endTime);
    if (
      startISO &&
      endISO &&
      new Date(endISO).getTime() <= new Date(startISO).getTime()
    ) {
      setError("Время окончания должно быть позже начала");
      return false;
    }
    setError(null);
    return true;
  }, [dateStr, startTime, endTime]);

  const handleSave = useCallback(async () => {
    if (!session || !validate()) return;
    const startAt = buildISO(dateStr, startTime);
    const endAt = buildISO(dateStr, endTime);
    if (!startAt || !endAt) {
      setError(COACH_SCHEDULE_COPY.fieldValidationHint);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateTrainingSession(session.id, {
        type,
        subType: subType.trim() || null,
        startAt,
        endAt,
        locationName: locationName.trim() || null,
        locationAddress: locationAddress.trim() || null,
        notes: notes.trim() || null,
        groupId: trainingGroupKey === "__whole__" ? null : trainingGroupKey,
      });
      coachHapticSuccess();
      await onAfterMutation();
      onClose();
    } catch (err) {
      if (isAuthRequiredError(err)) {
        setError("Требуется авторизация");
      } else if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Не удалось сохранить");
      }
    } finally {
      setSaving(false);
    }
  }, [
    session,
    validate,
    dateStr,
    startTime,
    endTime,
    type,
    subType,
    locationName,
    locationAddress,
    notes,
    trainingGroupKey,
    onAfterMutation,
    onClose,
  ]);

  const runDelete = useCallback(async () => {
    if (!session) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteTrainingSession(session.id);
      coachHapticLight();
      await onAfterMutation();
      onClose();
    } catch (err) {
      if (isAuthRequiredError(err)) {
        setError("Требуется авторизация");
      } else if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Не удалось удалить");
      }
    } finally {
      setDeleting(false);
    }
  }, [session, onAfterMutation, onClose]);

  const confirmDelete = useCallback(() => {
    coachHapticLight();
    Alert.alert(
      COACH_SCHEDULE_COPY.deleteSlotConfirmTitle,
      COACH_SCHEDULE_COPY.deleteSlotConfirmBody,
      [
        { text: COACH_SCHEDULE_COPY.cancel, style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => void runDelete(),
        },
      ]
    );
  }, [runDelete]);

  const openSimilar = useCallback(() => {
    if (!session) return;
    coachHapticLight();
    onClose();
    router.push({
      pathname: "/schedule/create",
      params: {
        weekStartDate: weekStartDateParam,
        prefillDate: dateStr,
        prefillStart: startTime,
        prefillEnd: endTime,
        prefillType: type,
        prefillGroup:
          trainingGroupKey === "__whole__" ? "__whole__" : trainingGroupKey,
        teamId: session.teamId,
        prefillLocationName: locationName.trim(),
        prefillLocationAddress: locationAddress.trim(),
        prefillNotes: notes.trim(),
        prefillSubType: subType.trim(),
      },
    });
  }, [
    session,
    router,
    weekStartDateParam,
    dateStr,
    startTime,
    endTime,
    type,
    trainingGroupKey,
    locationName,
    locationAddress,
    notes,
    subType,
    onClose,
  ]);

  const openDetail = useCallback(() => {
    if (!session) return;
    coachHapticLight();
    onClose();
    onOpenDetail(session.id);
  }, [session, onClose, onOpenDetail]);

  const openLiveTraining = useCallback(async () => {
    if (!session) return;
    coachHapticLight();
    setLiveNavBusy(true);
    try {
      await navigateToLiveTrainingFromScheduleSlot(router, session);
      onClose();
    } finally {
      setLiveNavBusy(false);
    }
  }, [session, router, onClose]);

  if (!session) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kav}
        >
          <View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
                maxHeight: "88%",
              },
            ]}
          >
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>
          <Text style={styles.sheetTitle}>{COACH_SCHEDULE_COPY.quickEditTitle}</Text>
          <Text style={styles.teamLine} numberOfLines={1}>
            {session.teamName}
          </Text>

          <SectionCard>
            <Text style={styles.label}>Живая тренировка</Text>
            <PrimaryButton
              title={liveNavBusy ? "…" : liveCtaTitle}
              onPress={() => void openLiveTraining()}
              disabled={liveNavBusy || saving || deleting}
              style={styles.primaryBtn}
            />
            {activeLive && activeLive.teamId !== session.teamId ? (
              <Text style={styles.liveHint}>
                Есть другая активная сессия — начать новую можно после её завершения.
              </Text>
            ) : null}
          </SectionCard>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScroll}
          >
            <SectionCard>
              <Text style={styles.label}>Дата (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="2026-03-29"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
              />
            </SectionCard>

            <SectionCard>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>Начало</Text>
                  <TextInput
                    style={styles.input}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="18:00"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>Конец</Text>
                  <TextInput
                    style={styles.input}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="19:30"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </SectionCard>

            <SectionCard>
              <Text style={styles.label}>Тип</Text>
              <View style={styles.chipRow}>
                {KINDS.map((k) => (
                  <Pressable
                    key={k.value}
                    onPress={() => setType(k.value)}
                    style={[styles.chip, type === k.value && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        type === k.value && styles.chipTextActive,
                      ]}
                    >
                      {k.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.label, styles.labelSpaced]}>Подтип (необязательно)</Text>
              <TextInput
                style={styles.input}
                value={subType}
                onChangeText={setSubType}
                placeholder="Например, силовая"
                placeholderTextColor={theme.colors.textMuted}
              />
            </SectionCard>

            <SectionCard>
              <Text style={styles.label}>Группа</Text>
              {groupsLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <View style={styles.chipRow}>
                  <Pressable
                    onPress={() => setTrainingGroupKey("__whole__")}
                    style={[
                      styles.chip,
                      trainingGroupKey === "__whole__" && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        trainingGroupKey === "__whole__" && styles.chipTextActive,
                      ]}
                    >
                      Вся команда
                    </Text>
                  </Pressable>
                  {groups.map((g) => (
                    <Pressable
                      key={g.id}
                      onPress={() => setTrainingGroupKey(g.id)}
                      style={[
                        styles.chip,
                        trainingGroupKey === g.id && styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          trainingGroupKey === g.id && styles.chipTextActive,
                        ]}
                      >
                        {g.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </SectionCard>

            <SectionCard>
              <Text style={styles.label}>Место</Text>
              <TextInput
                style={styles.input}
                value={locationName}
                onChangeText={setLocationName}
                placeholder="Арена"
                placeholderTextColor={theme.colors.textMuted}
              />
              <Text style={[styles.label, styles.labelSpaced]}>Адрес</Text>
              <TextInput
                style={styles.input}
                value={locationAddress}
                onChangeText={setLocationAddress}
                placeholder="Необязательно"
                placeholderTextColor={theme.colors.textMuted}
              />
            </SectionCard>

            <SectionCard>
              <Text style={styles.label}>Заметки</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Для себя"
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />
            </SectionCard>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              title={saving ? "Сохранение…" : COACH_SCHEDULE_COPY.saveSlot}
              onPress={() => void handleSave()}
              disabled={saving || deleting}
              style={styles.primaryBtn}
            />

            <PrimaryButton
              title={COACH_SCHEDULE_COPY.similarSlot}
              variant="outline"
              onPress={openSimilar}
              disabled={saving || deleting}
              style={styles.secondaryBtn}
            />

            <PrimaryButton
              title={COACH_SCHEDULE_COPY.openSessionDetail}
              variant="outline"
              onPress={openDetail}
              disabled={saving || deleting}
              style={styles.secondaryBtn}
            />

            <PrimaryButton
              title={deleting ? "Удаление…" : COACH_SCHEDULE_COPY.deleteSlot}
              variant="outline"
              onPress={confirmDelete}
              disabled={saving || deleting}
              style={styles.secondaryBtn}
              textStyle={styles.dangerText}
            />

            <PrimaryButton
              title={COACH_SCHEDULE_COPY.cancel}
              variant="outline"
              onPress={onClose}
              disabled={saving || deleting}
            />
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  kav: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
  },
  grabberWrap: { alignItems: "center", paddingVertical: theme.spacing.sm },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  sheetTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  teamLine: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  sheetScroll: {
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  labelSpaced: { marginTop: theme.spacing.md },
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
  textArea: { minHeight: 72, textAlignVertical: "top" },
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
  chipActive: { backgroundColor: theme.colors.primaryMuted },
  chipText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.primary, fontWeight: "600" },
  row: { flexDirection: "row", gap: theme.spacing.md },
  half: { flex: 1 },
  error: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  primaryBtn: { marginTop: theme.spacing.sm },
  secondaryBtn: { marginTop: theme.spacing.xs },
  dangerText: { color: theme.colors.error },
  liveHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
});
