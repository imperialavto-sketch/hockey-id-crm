import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type TeamHeroProps = {
  teamsCount: number;
  totalPlayers: number;
};

export function TeamHero({ teamsCount, totalPlayers }: TeamHeroProps) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>Команды</Text>
      <Text style={styles.title}>Мои команды</Text>
      <View style={styles.context}>
        <Text style={styles.summary}>
          {teamsCount} команд
        </Text>
        <View style={styles.dot} />
        <Text style={styles.summary}>
          {totalPlayers} игроков всего
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: theme.spacing.xl,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: theme.colors.text,
    lineHeight: 38,
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
    backgroundColor: theme.colors.textMuted,
  },
});
