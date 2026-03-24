/**
 * Coach Insight — rule-based summary block for Player Detail.
 * Shows when >= 3 observations exist.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import type { CoachInsight } from '@/lib/coachInsightHelpers';
import { theme } from '@/constants/theme';

type CoachInsightBlockProps = {
  insight: CoachInsight;
  observationCount: number;
};

export function CoachInsightBlock({ insight, observationCount }: CoachInsightBlockProps) {
  return (
    <SectionCard elevated style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Coach Insight</Text>
        <Text style={styles.badge}>{observationCount} наблюдений</Text>
      </View>
      <Text style={styles.title}>Вывод тренера</Text>
      <Text style={styles.summary}>{insight.summary}</Text>

      {insight.positives.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.bulletLabel}>Что хорошо</Text>
          {insight.positives.map((p, i) => (
            <Text key={i} style={styles.bullet}>
              • {p}
            </Text>
          ))}
        </View>
      ) : null}

      {insight.concerns.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.bulletLabel}>На что обратить внимание</Text>
          {insight.concerns.map((c, i) => (
            <Text key={i} style={[styles.bullet, styles.bulletConcern]}>
              • {c}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.bulletLabel}>Рекомендация</Text>
        <Text style={styles.recommendation}>{insight.recommendation}</Text>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceElevated,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  badge: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  summary: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  bulletLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: theme.spacing.xs,
  },
  bullet: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    marginBottom: 2,
    lineHeight: 20,
  },
  bulletConcern: {
    color: theme.colors.warning,
  },
  recommendation: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
});
