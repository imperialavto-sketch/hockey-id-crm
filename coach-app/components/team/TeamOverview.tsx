import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type TeamOverviewProps = {
  nextSession: string;
  totalConfirmed: number;
  totalExpected: number;
};

export function TeamOverview({
  nextSession,
  totalConfirmed,
  totalExpected,
}: TeamOverviewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text style={styles.label}>Ближайшая тренировка</Text>
        <Text style={styles.value}>{nextSession}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <Text style={styles.label}>Посещаемость</Text>
        <Text style={styles.value}>
          <Text style={styles.valueHighlight}>{totalConfirmed}</Text>
          <Text style={styles.valueMuted}>/{totalExpected}</Text>
          {' '}
          <Text style={styles.valueSmall}>подтверждено</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  stat: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  value: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  valueHighlight: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  valueMuted: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  valueSmall: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
});
