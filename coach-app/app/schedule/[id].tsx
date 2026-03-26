import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  CoachDetailLoadingBody,
  CoachDetailErrorState,
  CoachDetailEmptyState,
} from "@/components/details/CoachDetailScreenPrimitives";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  getTrainingSessionById,
  getTrainingSessionAttendance,
  setTrainingSessionAttendance,
  bulkSetTrainingSessionAttendance,
  getTrainingEvaluations,
  setTrainingEvaluation,
  getTrainingReport,
  setTrainingReport,
  type CoachTrainingSession,
  type TrainingAttendancePlayer,
  type TrainingEvaluation,
} from "@/services/coachScheduleService";
import { isAuthRequiredError } from "@/lib/coachAuth";
import { theme } from "@/constants/theme";
import {
  COACH_SESSION_DETAIL_COPY as COPY,
  COACH_SCHEDULE_AUTH_LINE,
} from "@/lib/coachScheduleSessionDetailUi";

const TYPE_LABELS: Record<string, string> = {
  ice: "Лёд",
  ofp: "ОФП",
  hockey: "Лёд",
  game: "Лёд",
  individual: "Лёд",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function ScheduleSessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = typeof id === "string" ? id : "";
  const [session, setSession] = useState<CoachTrainingSession | null>(null);
  const [attendance, setAttendance] = useState<TrainingAttendancePlayer[]>([]);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [bulkTarget, setBulkTarget] = useState<"present" | "absent" | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<TrainingEvaluation[]>([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(true);
  const [evaluationsError, setEvaluationsError] = useState<string | null>(null);
  const [savingEvalPlayerId, setSavingEvalPlayerId] = useState<string | null>(
    null
  );
  const [noteOpenFor, setNoteOpenFor] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [reportFocusAreas, setReportFocusAreas] = useState("");
  const [reportSummary, setReportSummary] = useState("");
  const [reportCoachNote, setReportCoachNote] = useState("");
  const [reportParentMessage, setReportParentMessage] = useState("");
  const [reportLoading, setReportLoading] = useState(true);
  const [reportLoadError, setReportLoadError] = useState<string | null>(null);
  const [reportSaving, setReportSaving] = useState(false);
  const [reportSaveError, setReportSaveError] = useState<string | null>(null);
  const [reportSaved, setReportSaved] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setAttendance([]);
      setEvaluations([]);
      setEvaluationsLoading(false);
      setReportFocusAreas("");
      setReportSummary("");
      setReportCoachNote("");
      setReportParentMessage("");
      setReportLoading(false);
      setReportLoadError(null);
      setReportSaveError(null);
      setReportSaved(false);
      setLoading(false);
      return;
    }
    setError(null);
    setAttendanceError(null);
    setEvaluationsError(null);
    setEvaluationsLoading(true);
    setReportLoadError(null);
    setReportSaveError(null);
    setReportSaved(false);
    setReportLoading(true);
    try {
      const data = await getTrainingSessionById(sessionId);
      setSession(data);
      try {
        const rep = await getTrainingReport(sessionId);
        setReportFocusAreas(rep.focusAreas ?? "");
        setReportSummary(rep.summary ?? "");
        setReportCoachNote(rep.coachNote ?? "");
        setReportParentMessage(rep.parentMessage ?? "");
      } catch {
        setReportFocusAreas("");
        setReportSummary("");
        setReportCoachNote("");
        setReportParentMessage("");
        setReportLoadError(COPY.reportBlockLoadFailed);
      } finally {
        setReportLoading(false);
      }
      try {
        const rows = await getTrainingSessionAttendance(sessionId);
        setAttendance(Array.isArray(rows) ? rows : []);
      } catch {
        setAttendance([]);
        setAttendanceError(COPY.attendanceListFailed);
      }
      try {
        const evRows = await getTrainingEvaluations(sessionId);
        setEvaluations(Array.isArray(evRows) ? evRows : []);
      } catch {
        setEvaluations([]);
        setEvaluationsError(COPY.evaluationsBlockLoadFailed);
      }
    } catch (err) {
      setSession(null);
      setAttendance([]);
      setEvaluations([]);
      setEvaluationsError(null);
      setReportLoading(false);
      setError(
        isAuthRequiredError(err)
          ? COACH_SCHEDULE_AUTH_LINE
          : err instanceof Error
            ? err.message
            : COPY.loadErrorFallback
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setEvaluationsLoading(false);
    }
  }, [sessionId]);

  const onSetStatus = async (playerId: string, status: "present" | "absent") => {
    if (!sessionId) return;
    setSavingPlayerId(playerId);
    setAttendanceError(null);
    try {
      await setTrainingSessionAttendance(sessionId, playerId, status);
      setAttendance((prev) =>
        prev.map((p) => (p.playerId === playerId ? { ...p, status } : p))
      );
    } catch (err) {
      setAttendanceError(
        err instanceof Error ? err.message : COPY.saveFailed
      );
    } finally {
      setSavingPlayerId(null);
    }
  };

  const onBulkSet = async (status: "present" | "absent") => {
    if (!sessionId) return;
    setBulkTarget(status);
    setAttendanceError(null);
    try {
      await bulkSetTrainingSessionAttendance(sessionId, status);
      const rows = await getTrainingSessionAttendance(sessionId);
      setAttendance(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setAttendanceError(
        err instanceof Error ? err.message : COPY.bulkSaveFailed
      );
    } finally {
      setBulkTarget(null);
    }
  };

  const openNoteEditor = (playerId: string, currentNote?: string) => {
    setNoteOpenFor(playerId);
    setNoteDraft((d) => ({
      ...d,
      [playerId]: currentNote ?? d[playerId] ?? "",
    }));
  };

  const saveNote = async (playerId: string) => {
    if (!sessionId) return;
    const row = evaluations.find((e) => e.playerId === playerId);
    const ev = row?.evaluation ?? {};
    const text = (noteDraft[playerId] ?? "").trim();
    setSavingEvalPlayerId(playerId);
    setEvaluationsError(null);
    try {
      await setTrainingEvaluation(sessionId, {
        playerId,
        effort: ev.effort,
        focus: ev.focus,
        discipline: ev.discipline,
        note: text.length > 0 ? text : undefined,
      });
      setEvaluations((prev) =>
        prev.map((p) =>
          p.playerId === playerId
            ? {
                ...p,
                evaluation: {
                  ...(p.evaluation ?? {}),
                  effort: ev.effort,
                  focus: ev.focus,
                  discipline: ev.discipline,
                  note: text.length > 0 ? text : undefined,
                },
              }
            : p
        )
      );
      setNoteOpenFor(null);
    } catch {
      setEvaluationsError(COPY.saveFailed);
    } finally {
      setSavingEvalPlayerId(null);
    }
  };

  const saveTrainingReport = async () => {
    if (!sessionId) return;
    setReportSaving(true);
    setReportSaveError(null);
    setReportSaved(false);
    try {
      await setTrainingReport(sessionId, {
        focusAreas: reportFocusAreas.trim() || null,
        summary: reportSummary.trim() || null,
        coachNote: reportCoachNote.trim() || null,
        parentMessage: reportParentMessage.trim() || null,
      });
      setReportSaved(true);
      setTimeout(() => {
        setReportSaved(false);
      }, 2500);
    } catch {
      setReportSaveError(COPY.saveFailed);
    } finally {
      setReportSaving(false);
    }
  };

  const setScore = async (
    playerId: string,
    field: "effort" | "focus" | "discipline",
    value: number
  ) => {
    if (!sessionId) return;
    const row = evaluations.find((e) => e.playerId === playerId);
    const ev = row?.evaluation ?? {};
    setSavingEvalPlayerId(playerId);
    setEvaluationsError(null);
    try {
      await setTrainingEvaluation(sessionId, {
        playerId,
        effort: field === "effort" ? value : ev.effort,
        focus: field === "focus" ? value : ev.focus,
        discipline: field === "discipline" ? value : ev.discipline,
        note: ev.note,
      });
      setEvaluations((prev) =>
        prev.map((p) =>
          p.playerId === playerId
            ? {
                ...p,
                evaluation: {
                  ...(p.evaluation ?? {}),
                  [field]: value,
                },
              }
            : p
        )
      );
    } catch {
      setEvaluationsError(COPY.saveFailed);
    } finally {
      setSavingEvalPlayerId(null);
    }
  };

  React.useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  if (!sessionId) {
    return (
      <ScreenContainer>
        <CoachDetailEmptyState
          title={COPY.noIdTitle}
          description={COPY.noIdSubtitle}
          primaryTitle={COPY.backToSchedule}
          onPrimary={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  if (loading && !session) {
    return (
      <ScreenContainer contentContainerStyle={styles.loadingContent}>
        <CoachDetailLoadingBody
          eyebrow={COPY.heroEyebrow}
          title={COPY.loadingTitle}
          subtitle={COPY.loadingSubtitle}
        />
      </ScreenContainer>
    );
  }

  if (error || !session) {
    const description = error ?? COPY.notFoundShort;
    return (
      <ScreenContainer>
        <CoachDetailErrorState
          title={COPY.loadErrorTitle}
          description={description}
          hint={
            description !== COACH_SCHEDULE_AUTH_LINE
              ? COPY.networkRetryHint
              : undefined
          }
          retryTitle={COPY.retryCta}
          onRetry={() => void load()}
          backTitle={COPY.backToSchedule}
          onBack={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  const typeLabel = TYPE_LABELS[session.type] ?? session.type;
  const sub = session.subType?.trim();
  const kindDisplay = sub ? `${typeLabel} · ${sub}` : typeLabel;

  return (
    <ScreenContainer scroll={false} style={styles.screenRoot}>
      <ScrollView
        style={styles.scrollRoot}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <SectionCard elevated style={styles.sessionHeroCard}>
          <Text style={styles.heroEyebrow}>{COPY.heroEyebrow}</Text>
          <Text style={styles.dateText}>{formatDate(session.startAt)}</Text>
          <Text style={styles.timeText}>
            {formatTime(session.startAt)} – {formatTime(session.endAt)}
          </Text>
          <Text style={styles.titleText}>{kindDisplay}</Text>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{COPY.metaTeam}</Text>
            <Text style={styles.metaValue}>{session.teamName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{COPY.metaGroup}</Text>
            <Text style={styles.metaValue}>{session.groupName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{COPY.metaCoach}</Text>
            <Text style={styles.metaValue}>
              {session.coach.firstName} {session.coach.lastName}
            </Text>
          </View>
          {session.locationName ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{COPY.metaLocation}</Text>
              <Text style={styles.metaValue}>{session.locationName}</Text>
            </View>
          ) : null}
          {session.locationAddress ? (
            <Text style={styles.metaMuted}>{session.locationAddress}</Text>
          ) : null}
          {session.notes ? (
            <Text style={styles.notes}>{session.notes}</Text>
          ) : null}
          <View style={[styles.metaRow, styles.metaRowLast]}>
            <Text style={styles.metaLabel}>{COPY.metaStatus}</Text>
            <Text style={styles.metaValue}>
              {session.status} · {session.sessionStatus}
            </Text>
          </View>
        </SectionCard>

        <SectionCard elevated>
          <Text style={styles.sectionKicker}>{COPY.sectionAttendance}</Text>
          {attendance.length > 0 ? (
            <View style={styles.bulkRow}>
              <Pressable
                onPress={() => void onBulkSet("present")}
                disabled={bulkTarget !== null || savingPlayerId !== null}
                style={[
                  styles.bulkBtn,
                  (bulkTarget !== null || savingPlayerId !== null) &&
                    styles.bulkBtnDisabled,
                ]}
              >
                {bulkTarget === "present" ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                ) : (
                  <Text style={styles.bulkBtnText}>{COPY.bulkAllPresent}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => void onBulkSet("absent")}
                disabled={bulkTarget !== null || savingPlayerId !== null}
                style={[
                  styles.bulkBtn,
                  (bulkTarget !== null || savingPlayerId !== null) &&
                    styles.bulkBtnDisabled,
                ]}
              >
                {bulkTarget === "absent" ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                ) : (
                  <Text style={styles.bulkBtnText}>{COPY.bulkAllAbsent}</Text>
                )}
              </Pressable>
            </View>
          ) : null}
          {attendanceError ? (
            <View style={styles.errBlock}>
              <Text style={styles.attErr}>{attendanceError}</Text>
              {attendanceError !== COACH_SCHEDULE_AUTH_LINE ? (
                <Text style={styles.errorHintSmall}>{COPY.networkRetryHint}</Text>
              ) : null}
              <PrimaryButton
                title={COPY.retryCta}
                variant="outline"
                onPress={() => void load()}
                style={styles.inlineRetryBtn}
              />
            </View>
          ) : attendance.length === 0 ? (
            <Text style={styles.rowMuted}>{COPY.attendanceEmptyHint}</Text>
          ) : (
            attendance.map((p) => (
              <View key={p.playerId} style={styles.playerRow}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {p.name}
                </Text>
                <View style={styles.btnRow}>
                  <Pressable
                    onPress={() => onSetStatus(p.playerId, "present")}
                    disabled={
                      savingPlayerId === p.playerId || bulkTarget !== null
                    }
                    style={[
                      styles.markBtn,
                      p.status === "present" && styles.markBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.markBtnText,
                        p.status === "present" && styles.markBtnTextActive,
                      ]}
                    >
                      {COPY.attendancePresent}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onSetStatus(p.playerId, "absent")}
                    disabled={
                      savingPlayerId === p.playerId || bulkTarget !== null
                    }
                    style={[
                      styles.markBtn,
                      p.status === "absent" && styles.markBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.markBtnText,
                        p.status === "absent" && styles.markBtnTextActive,
                      ]}
                    >
                      {COPY.attendanceAbsent}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard elevated>
          <Text style={styles.sectionKicker}>{COPY.sectionReport}</Text>
          {reportLoading ? (
            <View style={styles.evalLoadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.rowMuted}>{COPY.reportLoading}</Text>
            </View>
          ) : reportLoadError ? (
            <View style={styles.errBlock}>
              <Text style={styles.attErr}>{reportLoadError}</Text>
              {reportLoadError !== COACH_SCHEDULE_AUTH_LINE ? (
                <Text style={styles.errorHintSmall}>{COPY.networkRetryHint}</Text>
              ) : null}
              <PrimaryButton
                title={COPY.retryCta}
                variant="outline"
                onPress={() => void load()}
                style={styles.inlineRetryBtn}
              />
            </View>
          ) : (
            <View>
              <Text style={[styles.reportLabel, styles.reportLabelFirst]}>
                {COPY.reportLabelFocus}
              </Text>
              <TextInput
                style={styles.reportInput}
                value={reportFocusAreas}
                onChangeText={setReportFocusAreas}
                placeholder={COPY.reportPlaceholderFocus}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                editable={!reportSaving}
              />
              <Text style={styles.reportLabel}>{COPY.reportLabelSummary}</Text>
              <TextInput
                style={styles.reportInput}
                value={reportSummary}
                onChangeText={setReportSummary}
                placeholder={COPY.reportPlaceholderSummary}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                editable={!reportSaving}
              />
              <Text style={styles.reportLabel}>{COPY.reportLabelCoach}</Text>
              <TextInput
                style={styles.reportInput}
                value={reportCoachNote}
                onChangeText={setReportCoachNote}
                placeholder={COPY.reportPlaceholderCoach}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                editable={!reportSaving}
              />
              <Text style={styles.reportLabel}>{COPY.reportLabelParents}</Text>
              <TextInput
                style={styles.reportInput}
                value={reportParentMessage}
                onChangeText={setReportParentMessage}
                placeholder={COPY.reportPlaceholderParents}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                editable={!reportSaving}
              />
              <PrimaryButton
                title={
                  reportSaving ? COPY.reportSaving : COPY.reportSaveCta
                }
                variant="outline"
                onPress={() => void saveTrainingReport()}
                disabled={reportSaving}
                animatedPress
                style={styles.reportSaveBtn}
              />
              {reportSaveError ? (
                <>
                  <Text style={styles.attErr}>{reportSaveError}</Text>
                  {reportSaveError !== COACH_SCHEDULE_AUTH_LINE ? (
                    <Text style={styles.errorHintSmall}>
                      {COPY.networkRetryHint}
                    </Text>
                  ) : null}
                </>
              ) : null}
              {reportSaved ? (
                <Text style={styles.reportSavedText}>{COPY.reportSaved}</Text>
              ) : null}
            </View>
          )}
        </SectionCard>

        <SectionCard elevated>
          <Text style={styles.sectionKicker}>{COPY.sectionEval}</Text>
          {evaluationsLoading ? (
            <View style={styles.evalLoadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.rowMuted}>{COPY.evalLoading}</Text>
            </View>
          ) : evaluationsError ? (
            <View style={styles.errBlock}>
              <Text style={styles.attErr}>{evaluationsError}</Text>
              {evaluationsError !== COACH_SCHEDULE_AUTH_LINE ? (
                <Text style={styles.errorHintSmall}>{COPY.networkRetryHint}</Text>
              ) : null}
              <PrimaryButton
                title={COPY.retryCta}
                variant="outline"
                onPress={() => void load()}
                style={styles.inlineRetryBtn}
              />
            </View>
          ) : evaluations.length === 0 ? (
            <Text style={styles.rowMuted}>{COPY.evalEmpty}</Text>
          ) : (
            evaluations.map((row) => {
              const ev = row.evaluation;
              const disabled = savingEvalPlayerId === row.playerId;
              const effort = ev?.effort;
              const focus = ev?.focus;
              const discipline = ev?.discipline;
              return (
                <View key={row.playerId} style={styles.evalPlayerBlock}>
                  <Text style={styles.evalPlayerName} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={styles.evalLabel}>{COPY.evalEffort}</Text>
                  <View style={styles.evalBtns}>
                    {([1, 2, 3, 4, 5] as const).map((n) => (
                      <Pressable
                        key={`e-${n}`}
                        onPress={() => void setScore(row.playerId, "effort", n)}
                        disabled={disabled}
                        style={[
                          styles.evalPill,
                          effort === n && styles.evalPillActive,
                          disabled && styles.evalPillDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.evalPillText,
                            effort === n && styles.evalPillTextActive,
                          ]}
                        >
                          {n}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.evalLabel}>{COPY.evalFocus}</Text>
                  <View style={styles.evalBtns}>
                    {([1, 2, 3, 4, 5] as const).map((n) => (
                      <Pressable
                        key={`f-${n}`}
                        onPress={() => void setScore(row.playerId, "focus", n)}
                        disabled={disabled}
                        style={[
                          styles.evalPill,
                          focus === n && styles.evalPillActive,
                          disabled && styles.evalPillDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.evalPillText,
                            focus === n && styles.evalPillTextActive,
                          ]}
                        >
                          {n}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.evalLabel}>{COPY.evalDiscipline}</Text>
                  <View style={styles.evalBtns}>
                    {([1, 2, 3, 4, 5] as const).map((n) => (
                      <Pressable
                        key={`d-${n}`}
                        onPress={() =>
                          void setScore(row.playerId, "discipline", n)
                        }
                        disabled={disabled}
                        style={[
                          styles.evalPill,
                          discipline === n && styles.evalPillActive,
                          disabled && styles.evalPillDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.evalPillText,
                            discipline === n && styles.evalPillTextActive,
                          ]}
                        >
                          {n}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {noteOpenFor === row.playerId ? (
                    <View style={styles.noteBox}>
                      <TextInput
                        style={styles.noteInput}
                        value={noteDraft[row.playerId] ?? ""}
                        onChangeText={(t) =>
                          setNoteDraft((d) => ({ ...d, [row.playerId]: t }))
                        }
                        placeholder={COPY.notePlaceholder}
                        placeholderTextColor={theme.colors.textMuted}
                        multiline
                        maxLength={500}
                        editable={!disabled}
                      />
                      <View style={styles.noteActions}>
                        <Pressable
                          onPress={() => setNoteOpenFor(null)}
                          style={styles.noteSecondary}
                          disabled={disabled}
                        >
                          <Text style={styles.noteSecondaryText}>
                            {COPY.noteCancel}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void saveNote(row.playerId)}
                          disabled={disabled}
                          style={styles.notePrimary}
                        >
                          <Text style={styles.notePrimaryText}>
                            {COPY.noteSave}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() =>
                        openNoteEditor(row.playerId, ev?.note)
                      }
                      disabled={disabled}
                      style={styles.commentBtn}
                    >
                      <Text style={styles.commentBtnText}>
                        {COPY.commentCta}
                        {ev?.note ? COPY.commentSavedMark : ""}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </SectionCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  scrollRoot: { flex: 1 },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  loadingContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
  },
  sessionHeroCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  heroEyebrow: {
    ...theme.typography.heroEyebrow,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  timeText: {
    ...theme.typography.subtitle,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  titleText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: "600",
  },
  metaDivider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
    marginVertical: theme.spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  metaRowLast: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    minWidth: 88,
  },
  metaValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  metaMuted: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  notes: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
    lineHeight: 22,
  },
  rowMuted: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
  },
  bulkRow: {
    flexDirection: "column",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  bulkBtn: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  bulkBtnDisabled: {
    opacity: 0.55,
  },
  bulkBtnText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: "600",
    textAlign: "center",
  },
  errBlock: {
    marginTop: theme.spacing.xs,
  },
  errorHintSmall: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  inlineRetryBtn: {
    alignSelf: "flex-start",
    minWidth: 160,
  },
  attErr: {
    ...theme.typography.caption,
    color: theme.colors.error,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  playerName: { ...theme.typography.body, color: theme.colors.text, flex: 1, marginRight: theme.spacing.md },
  btnRow: { flexDirection: "row", gap: theme.spacing.sm },
  markBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.surfaceElevated,
  },
  markBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  markBtnText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: "600",
  },
  markBtnTextActive: {
    color: theme.colors.primary,
  },
  evalLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  evalPlayerBlock: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  evalPlayerName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  evalLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  evalBtns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  evalPill: {
    minWidth: 36,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
  },
  evalPillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  evalPillDisabled: { opacity: 0.5 },
  evalPillText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  evalPillTextActive: { color: theme.colors.primary },
  commentBtn: {
    marginTop: theme.spacing.sm,
    alignSelf: "flex-start",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  commentBtnText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  noteBox: { marginTop: theme.spacing.sm },
  noteInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    minHeight: 72,
    textAlignVertical: "top",
  },
  noteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  noteSecondary: { padding: theme.spacing.sm },
  noteSecondaryText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  notePrimary: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryMuted,
  },
  notePrimaryText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  reportLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  reportLabelFirst: {
    marginTop: 0,
  },
  reportInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    minHeight: 72,
    textAlignVertical: "top",
  },
  reportSaveBtn: {
    marginTop: theme.spacing.lg,
    alignSelf: "stretch",
  },
  reportSavedText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
});
