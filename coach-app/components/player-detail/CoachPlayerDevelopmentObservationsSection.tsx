import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { theme } from '@/constants/theme';
import type { DevelopmentObservationRow } from '@/lib/coachDevelopmentNotesUi';

type Props = {
  loading: boolean;
  loadError: string | null;
  rows: DevelopmentObservationRow[];
  notesEndpointMissing: boolean;
  onRetry: () => void;
  onAddNote: () => void;
  authRequiredLine: string;
};

export function CoachPlayerDevelopmentObservationsSection({
  loading,
  loadError,
  rows,
  notesEndpointMissing,
  onRetry,
  onAddNote,
  authRequiredLine,
}: Props) {
  return (
    <DashboardSection title="Наблюдения по развитию">
      <SectionCard elevated>
        <Text style={styles.sectionHint} numberOfLines={2}>
          Заметки типа «Развитие» из вашей работы с игроком
        </Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Загрузка…</Text>
          </View>
        ) : null}

        {!loading && loadError ? (
          <View style={styles.errorBlock}>
            <Text style={styles.errorText}>{loadError}</Text>
            {loadError !== authRequiredLine ? (
              <PrimaryButton title="Повторить" variant="outline" onPress={onRetry} style={styles.retryBtn} />
            ) : null}
          </View>
        ) : null}

        {!loading && !loadError && notesEndpointMissing ? (
          <Text style={styles.emptyText}>Модуль заметок пока не подключён.</Text>
        ) : null}

        {!loading && !loadError && !notesEndpointMissing && rows.length === 0 ? (
          <Text style={styles.emptyText}>
            Пока нет заметок «Развитие». Зафиксируйте наблюдение из переписки или добавьте вручную.
          </Text>
        ) : null}

        {!loading && !loadError && rows.length > 0
          ? rows.map((row, index) => (
              <View
                key={row.id}
                style={[styles.row, index > 0 && styles.rowDivider]}
                accessibilityRole="text"
              >
                <View style={styles.rowMeta}>
                  <Text style={styles.rowDate}>{row.date}</Text>
                  {row.fromConversation ? (
                    <View style={styles.sourcePill}>
                      <Text style={styles.sourcePillText}>из переписки</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.rowPreview} numberOfLines={3}>
                  {row.preview}
                </Text>
              </View>
            ))
          : null}

        <PrimaryButton
          animatedPress
          title="Добавить наблюдение"
          variant="outline"
          onPress={onAddNote}
          style={styles.cta}
        />
      </SectionCard>
    </DashboardSection>
  );
}

const styles = StyleSheet.create({
  sectionHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  errorBlock: {
    paddingVertical: theme.spacing.sm,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  retryBtn: {
    alignSelf: 'flex-start',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    lineHeight: 22,
    paddingVertical: theme.spacing.sm,
  },
  row: {
    paddingVertical: theme.spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.md,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  rowDate: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.35,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  sourcePill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sourcePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accent,
    letterSpacing: 0.2,
  },
  rowPreview: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  cta: {
    marginTop: theme.spacing.md,
  },
});
