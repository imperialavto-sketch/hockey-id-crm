import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import {
  COACH_SESSION_DETAIL_COPY as COPY,
  COACH_SCHEDULE_AUTH_LINE,
} from "@/lib/coachScheduleSessionDetailUi";

export type ScheduleSessionReportSectionProps = {
  /** Загрузка начального отчёта (`GET .../report`). */
  reportLoading: boolean;
  /** Ошибка загрузки отчёта. */
  reportLoadError: string | null;
  /** Поле «фокусы» (контролируемое). */
  reportFocusAreas: string;
  setReportFocusAreas: (v: string) => void;
  /** Краткое резюме тренировки. */
  reportSummary: string;
  setReportSummary: (v: string) => void;
  /** Внутренняя заметка тренера. */
  reportCoachNote: string;
  setReportCoachNote: (v: string) => void;
  /** Сообщение для родителей. */
  reportParentMessage: string;
  setReportParentMessage: (v: string) => void;
  /** Идёт сохранение отчёта. */
  reportSaving: boolean;
  /** Ошибка последнего сохранения. */
  reportSaveError: string | null;
  /** Успешное сохранение (для бейджа/подтверждения). */
  reportSaved: boolean;
  /** Попытка сохранения (сервер: POST .../report → 405; текст подсказки через live publish). */
  onSaveReport: () => void;
  /** Повторить загрузку отчёта. */
  onRetryLoad: () => void;
  /** Одна строка контекста эфира по команде (behavioral-suggestions); не часть текста отчёта. */
  reportTeamBehaviorContextLine?: string | null;
};

/**
 * Отчёт по тренировке: чтение `GET /api/trainings/:id/report`.
 * Запись канонического отчёта — через публикацию из живой тренировки (P0-1).
 */
export function ScheduleSessionReportSection({
  reportLoading,
  reportLoadError,
  reportFocusAreas,
  setReportFocusAreas,
  reportSummary,
  setReportSummary,
  reportCoachNote,
  setReportCoachNote,
  reportParentMessage,
  setReportParentMessage,
  reportSaving,
  reportSaveError,
  reportSaved,
  onSaveReport,
  onRetryLoad,
  reportTeamBehaviorContextLine,
}: ScheduleSessionReportSectionProps) {
  return (
    <SectionCard elevated>
      <Text style={styles.sectionKicker}>{COPY.sectionReport}</Text>
      <Text style={styles.sectionMicroHint}>{COPY.reportSectionHint}</Text>
      {reportTeamBehaviorContextLine ? (
        <Text style={styles.teamBehaviorContextLine}>
          {reportTeamBehaviorContextLine}
        </Text>
      ) : null}
      {reportLoading ? (
        <View style={styles.loadingRow}>
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
            onPress={() => void onRetryLoad()}
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
            title={reportSaving ? COPY.reportSaving : COPY.reportSaveCta}
            variant="outline"
            onPress={() => void onSaveReport()}
            disabled={reportSaving}
            animatedPress
            style={styles.reportSaveBtn}
          />
          {reportSaveError ? (
            <>
              <Text style={styles.attErr}>{reportSaveError}</Text>
              {reportSaveError !== COACH_SCHEDULE_AUTH_LINE ? (
                <Text style={styles.errorHintSmall}>{COPY.networkRetryHint}</Text>
              ) : null}
            </>
          ) : null}
          {reportSaved ? (
            <Text style={styles.reportSavedText}>{COPY.reportSaved}</Text>
          ) : null}
        </View>
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
  teamBehaviorContextLine: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    marginTop: -theme.spacing.xs,
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
