import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import type {
  TrainingEvaluation,
  VoiceBehavioralMapEntry,
} from "@/services/coachScheduleService";
import {
  COACH_SESSION_DETAIL_COPY as COPY,
  COACH_SCHEDULE_AUTH_LINE,
} from "@/lib/coachScheduleSessionDetailUi";
import { buildLiveExplainabilityEvalContextBody } from "@/lib/behavioralExplainabilityUi";

export type ScheduleSessionEvaluationsSectionProps = {
  /** Строки оценок по игрокам (`GET .../evaluations`). */
  evaluations: TrainingEvaluation[];
  evaluationsLoading: boolean;
  evaluationsError: string | null;
  /** Игрок, для которого сохраняется оценка или заметка. */
  savingEvalPlayerId: string | null;
  /** Для какого `playerId` раскрыт редактор заметки (`null` — свёрнуто). */
  noteOpenFor: string | null;
  setNoteOpenFor: (id: string | null) => void;
  /** Черновики текста заметок по `playerId`. */
  noteDraft: Record<string, string>;
  setNoteDraft: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  /** Установка балла по полю оценки. */
  onSetScore: (
    playerId: string,
    field: "effort" | "focus" | "discipline",
    value: number
  ) => void | Promise<void>;
  /** Сохранить заметку игрока. */
  onSaveNote: (playerId: string) => void | Promise<void>;
  onRetryLoad: () => void;
  openPlayerFromSession: (playerId: string) => void;
  renderHockeyIdLinks: (playerId: string, name: string) => React.ReactNode;
  /**
   * Подсказки live behavioral + explainability (`GET .../behavioral-suggestions`).
   * Только для вторичной строки контекста; оценки тренера не меняются.
   */
  voiceBehavioralByPlayer?: ReadonlyMap<string, VoiceBehavioralMapEntry>;
};

/**
 * Оценки усилия / фокуса / дисциплины и заметки: `GET`/`POST` `/api/trainings/:id/evaluations`.
 * Редактор заметки и раскрытие строки — внутри секции (`noteOpenFor` / `noteDraft`).
 */
export function ScheduleSessionEvaluationsSection({
  evaluations,
  evaluationsLoading,
  evaluationsError,
  savingEvalPlayerId,
  noteOpenFor,
  setNoteOpenFor,
  noteDraft,
  setNoteDraft,
  onSetScore,
  onSaveNote,
  onRetryLoad,
  openPlayerFromSession,
  renderHockeyIdLinks,
  voiceBehavioralByPlayer,
}: ScheduleSessionEvaluationsSectionProps) {
  const openNoteEditor = useCallback(
    (playerId: string, currentNote?: string) => {
      setNoteOpenFor(playerId);
      setNoteDraft((d) => ({
        ...d,
        [playerId]: currentNote ?? d[playerId] ?? "",
      }));
    },
    [setNoteDraft, setNoteOpenFor]
  );

  return (
    <SectionCard elevated>
      <Text style={styles.sectionKicker}>{COPY.sectionEval}</Text>
      <Text style={styles.sectionMicroHint}>{COPY.evalSectionHint}</Text>
      {evaluationsLoading ? (
        <View style={styles.loadingRow}>
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
            onPress={() => void onRetryLoad()}
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
          const liveContextBody = buildLiveExplainabilityEvalContextBody(
            voiceBehavioralByPlayer?.get(row.playerId)?.explainability
          );
          return (
            <View key={row.playerId} style={styles.evalPlayerBlock}>
              <View style={styles.evalPlayerHeader}>
                <Pressable
                  onPress={() => openPlayerFromSession(row.playerId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Карточка игрока ${row.name}`}
                >
                  <Text style={styles.evalPlayerName} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={styles.playerCardCue}>Карточка</Text>
                </Pressable>
                {renderHockeyIdLinks(row.playerId, row.name)}
              </View>
              <Text style={styles.evalLabel}>{COPY.evalEffort}</Text>
              <View style={styles.evalBtns}>
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <Pressable
                    key={`e-${n}`}
                    onPress={() => void onSetScore(row.playerId, "effort", n)}
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
                    onPress={() => void onSetScore(row.playerId, "focus", n)}
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
                      void onSetScore(row.playerId, "discipline", n)
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
              {liveContextBody ? (
                <Text style={styles.evalLiveContextLine}>
                  {COPY.evalLiveContextPrefix} {liveContextBody}
                </Text>
              ) : null}
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
                      onPress={() => void onSaveNote(row.playerId)}
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
                  onPress={() => openNoteEditor(row.playerId, ev?.note)}
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
  );
}

const styles = StyleSheet.create({
  sectionKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  sectionMicroHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  rowMuted: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 18,
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
  evalPlayerBlock: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  evalPlayerHeader: {
    marginBottom: theme.spacing.sm,
  },
  evalPlayerName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  playerCardCue: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
    fontSize: 11,
    marginTop: 2,
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
  evalLiveContextLine: {
    ...theme.typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
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
});
