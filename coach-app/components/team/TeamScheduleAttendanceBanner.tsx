import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';

export type TeamScheduleAttendanceBannerProps = {
  /** Переход на экран расписания (обычно `/schedule`). */
  onOpenSchedule: () => void;
};

const COPY = {
  kicker: 'Посещаемость — в расписании',
  body:
    'Отметки присутствия ставятся на карточке тренировки: откройте «Расписание», выберите слот — там список игроков и кнопки «Присутствует» / «Отсутствует».',
  cta: 'Открыть расписание',
  ctaHint:
    'Открывает список тренировок. Выберите слот, чтобы отметить посещаемость.',
} as const;

/**
 * CTA-блок на hub команды: направляет тренера в расписание для фактической отметки посещаемости
 * (не через отдельный маршрут `/attendance/*`).
 */
export function TeamScheduleAttendanceBanner({
  onOpenSchedule,
}: TeamScheduleAttendanceBannerProps) {
  return (
    <SectionCard elevated style={styles.card}>
      <Text accessibilityRole="header" style={styles.kicker}>
        {COPY.kicker}
      </Text>
      <Text style={styles.body}>{COPY.body}</Text>
      <PrimaryButton
        title={COPY.cta}
        variant="outline"
        onPress={onOpenSchedule}
        style={styles.btn}
        accessibilityHint={COPY.ctaHint}
      />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.layout.sectionGap,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  btn: {
    alignSelf: 'stretch',
  },
});
