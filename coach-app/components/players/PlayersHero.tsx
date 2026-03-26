import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type PlayersHeroProps = {
  totalCount: number;
  teamsSummary: string;
  /** Optional line under title (e.g. empty roster context). */
  subtitle?: string;
  /** When true, count line shows a neutral placeholder instead of zero. */
  loading?: boolean;
};

export function PlayersHero({ totalCount, teamsSummary, subtitle, loading }: PlayersHeroProps) {
  const countLabel = loading
    ? 'Загружаем…'
    : totalCount === 0
      ? 'Нет игроков'
      : `${totalCount} ${totalCount === 1 ? 'игрок' : totalCount < 5 ? 'игрока' : 'игроков'}`;

  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>Ростер</Text>
      <Text style={styles.title}>Игроки</Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.context}>
        <Text style={styles.summary}>{countLabel}</Text>
        <View style={styles.dot} />
        <Text style={styles.summary}>{teamsSummary}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: theme.layout.heroBottom,
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
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  summary: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
});
