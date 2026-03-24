import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type MessagesOverviewProps = {
  unreadCount: number;
  parentCount?: number;
  teamCount?: number;
};

export function MessagesOverview({
  unreadCount,
  parentCount = 0,
  teamCount = 0,
}: MessagesOverviewProps) {
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
      {unreadCount === 0 && parentCount === 0 && teamCount === 0 ? (
        <Text style={styles.empty}>Всё прочитано</Text>
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
