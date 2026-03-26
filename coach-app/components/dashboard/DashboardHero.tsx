import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type DashboardHeroProps = {
  dateLabel: string;
  teamsSummary: string;
  /** Одна строка контекста: ростер, сессия, фокус дня */
  subtitle?: string;
};

export function DashboardHero({ dateLabel, teamsSummary, subtitle }: DashboardHeroProps) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>Панель тренера</Text>
      <Text style={styles.title}>Главная</Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.context}>
        <Text style={styles.date}>{dateLabel}</Text>
        <View style={styles.dot} />
        <Text style={styles.teams}>{teamsSummary}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: theme.layout.heroBottom,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  eyebrow: {
    ...theme.typography.heroEyebrow,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  title: {
    ...theme.typography.hero,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  date: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  teams: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
