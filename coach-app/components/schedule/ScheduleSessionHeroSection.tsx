import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import type { CoachTrainingSession } from "@/services/coachScheduleService";
import { COACH_SESSION_DETAIL_COPY as COPY } from "@/lib/coachScheduleSessionDetailUi";
import {
  SCHEDULE_SESSION_STATUS_LABELS,
  SCHEDULE_SESSION_TYPE_LABELS,
} from "@/lib/scheduleSessionDetailLabels";

function formatSessionStatusLabel(status?: string | null): string {
  if (!status) return "Статус уточняется";
  return SCHEDULE_SESSION_STATUS_LABELS[status] ?? status;
}

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

export type ScheduleSessionHeroSectionProps = {
  /** Сессия из `GET /api/trainings/:id`. */
  session: CoachTrainingSession;
  /** Подпись CTA live-training («Начать тренировку» / «Продолжить тренировку»). */
  liveTrainingTitle?: string;
  /** Переход в live-training с контекстом слота расписания. */
  onLiveTrainingPress?: () => void;
  liveTrainingBusy?: boolean;
};

/**
 * Верхняя карточка детали тренировки: дата/время, тип, команда/группа/тренер/площадка, статусы,
 * CTA live-training как единственный канонический вход в тренировку.
 */
export function ScheduleSessionHeroSection({
  session,
  liveTrainingTitle,
  onLiveTrainingPress,
  liveTrainingBusy,
}: ScheduleSessionHeroSectionProps) {
  const kindDisplay = useMemo(() => {
    const typeLabel =
      SCHEDULE_SESSION_TYPE_LABELS[session.type] ?? session.type;
    const sub = session.subType?.trim();
    return sub ? `${typeLabel} · ${sub}` : typeLabel;
  }, [session.subType, session.type]);

  return (
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
        <Text style={styles.metaValue}>
          {session.groupName?.trim() || 'Команда'}
        </Text>
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
      {session.arenaNextTrainingFocus?.trim() ? (
        <View style={[styles.metaRow, styles.arenaFocusRow]}>
          <Text style={styles.metaLabel}>Фокус (Арена)</Text>
          <Text style={[styles.metaValue, styles.arenaFocusValue]}>
            {session.arenaNextTrainingFocus.trim()}
          </Text>
        </View>
      ) : null}
      <View style={[styles.metaRow, styles.metaRowLast]}>
        <Text style={styles.metaLabel}>{COPY.metaStatus}</Text>
        <Text style={styles.metaValue}>
          {formatSessionStatusLabel(session.status)} ·{" "}
          {formatSessionStatusLabel(session.sessionStatus)}
        </Text>
      </View>
      {onLiveTrainingPress && liveTrainingTitle ? (
        <View style={styles.liveTrainingWrap}>
          <Text style={styles.liveTrainingKicker}>{COPY.liveTrainingKicker}</Text>
          <PrimaryButton
            title={liveTrainingBusy ? "…" : liveTrainingTitle}
            onPress={() => void onLiveTrainingPress()}
            disabled={Boolean(liveTrainingBusy)}
            animatedPress
            style={styles.liveTrainingButton}
          />
        </View>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
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
  arenaFocusRow: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  arenaFocusValue: {
    lineHeight: 22,
  },
  liveTrainingWrap: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  liveTrainingKicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  liveTrainingButton: {
    alignSelf: "stretch",
  },
});
