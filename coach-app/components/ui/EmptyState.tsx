import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { theme } from '@/constants/theme';

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ title, subtitle, icon = '—', action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  icon: {
    fontSize: 24,
    color: theme.colors.textMuted,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  action: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryMuted,
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionText: {
    ...theme.typography.subtitle,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
