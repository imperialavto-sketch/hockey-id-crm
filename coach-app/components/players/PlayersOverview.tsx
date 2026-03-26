import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { COACH_PLAYERS_LIST_COPY } from '@/lib/coachPlayersListUi';

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
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>{COACH_PLAYERS_LIST_COPY.overviewAllGood}</Text>
          <Text style={styles.emptyHint}>{COACH_PLAYERS_LIST_COPY.overviewAllGoodHint}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
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
  emptyWrap: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  empty: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  emptyHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
});
