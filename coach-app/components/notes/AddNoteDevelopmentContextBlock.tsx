import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import { theme } from '@/constants/theme';
import type { DevelopmentObservationRow } from '@/lib/coachDevelopmentNotesUi';

type Props = {
  rows: DevelopmentObservationRow[];
};

/**
 * Compact support strip on Add Note: last development observations before the coach writes.
 * Hidden when there is nothing to show (no fetch spinner — keeps screen calm).
 */
export function AddNoteDevelopmentContextBlock({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <View style={styles.outer}>
      <SectionCard elevated style={styles.card}>
        <Text style={styles.title}>Недавно по развитию</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          Коротко для справки перед новой записью
        </Text>
        {rows.map((row, index) => (
          <View
            key={row.id}
            style={[styles.row, index > 0 && styles.rowDivider]}
            accessibilityRole="text"
          >
            <View style={styles.meta}>
              <Text style={styles.date}>{row.date}</Text>
              {row.fromConversation ? (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>из переписки</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.preview} numberOfLines={2}>
              {row.preview}
            </Text>
          </View>
        ))}
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: theme.spacing.md,
  },
  card: {
    paddingVertical: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(96, 165, 250, 0.45)',
  },
  title: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    lineHeight: 17,
  },
  row: {
    paddingTop: theme.spacing.xs,
  },
  rowDivider: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.accentMuted,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  preview: {
    ...theme.typography.caption,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
