import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type PlayersOverviewProps = {
  watchlistCount?: number;
  needsFollowUpCount?: number;
};

export function PlayersOverview({
  watchlistCount = 0,
  needsFollowUpCount = 0,
}: PlayersOverviewProps) {
  return (
    <View style={styles.container}>
      {watchlistCount > 0 ? (
        <View style={styles.stat}>
          <Text style={styles.value}>{watchlistCount}</Text>
          <Text style={styles.label}>в наблюдении</Text>
        </View>
      ) : null}
      {needsFollowUpCount > 0 ? (
        <>
          {watchlistCount > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.stat}>
            <Text style={[styles.value, styles.valueHighlight]}>{needsFollowUpCount}</Text>
            <Text style={styles.label}>требуется контакт</Text>
          </View>
        </>
      ) : null}
      {watchlistCount === 0 && needsFollowUpCount === 0 ? (
        <Text style={styles.empty}>Все игроки в порядке</Text>
      ) : null}
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
  value: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  valueHighlight: {
    color: theme.colors.warning,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  empty: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
