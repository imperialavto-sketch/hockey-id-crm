import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type MessagesOverviewProps = {
  unreadCount: number;
  parentCount?: number;
  teamCount?: number;
  awaitingReplyCount?: number;
  needsReactionCount?: number;
};

export function MessagesOverview({
  unreadCount,
  parentCount = 0,
  teamCount = 0,
  awaitingReplyCount = 0,
  needsReactionCount = 0,
}: MessagesOverviewProps) {
  const hasAwaiting = awaitingReplyCount > 0;
  const hasReaction = needsReactionCount > 0;
  const hasAny =
    unreadCount > 0 || parentCount > 0 || teamCount > 0 || hasAwaiting || hasReaction;

  return (
    <View style={styles.container}>
      {unreadCount > 0 ? (
        <View style={styles.stat}>
          <Text style={[styles.value, styles.valueHighlight]}>{unreadCount}</Text>
          <Text style={styles.label}>непрочитано</Text>
        </View>
      ) : null}
      {parentCount > 0 ? (
        <>
          {unreadCount > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.stat}>
            <Text style={styles.value}>{parentCount}</Text>
            <Text style={styles.label}>от родителей</Text>
          </View>
        </>
      ) : null}
      {teamCount > 0 ? (
        <>
          {(unreadCount > 0 || parentCount > 0) ? <View style={styles.divider} /> : null}
          <View style={styles.stat}>
            <Text style={styles.value}>{teamCount}</Text>
            <Text style={styles.label}>командные</Text>
          </View>
        </>
      ) : null}
      {hasAwaiting ? (
        <>
          {(unreadCount > 0 || parentCount > 0 || teamCount > 0) ? (
            <View style={styles.divider} />
          ) : null}
          <View style={styles.stat}>
            <Text style={styles.value}>{awaitingReplyCount}</Text>
            <Text style={styles.label}>ждём ответа</Text>
          </View>
        </>
      ) : null}
      {hasReaction ? (
        <>
          {(unreadCount > 0 || parentCount > 0 || teamCount > 0 || hasAwaiting) ? (
            <View style={styles.divider} />
          ) : null}
          <View style={styles.stat}>
            <Text style={[styles.value, styles.valuePrimary]}>{needsReactionCount}</Text>
            <Text style={styles.label}>готово к ответу</Text>
          </View>
        </>
      ) : null}
      {!hasAny ? (
        <Text style={styles.empty}>Всё спокойно</Text>
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
    color: theme.colors.accent,
  },
  valuePrimary: {
    color: theme.colors.primary,
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
