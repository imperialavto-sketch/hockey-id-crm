import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { PlayerDetailData } from '@/constants/playerDetailData';

type AddNoteHeroProps = {
  player: PlayerDetailData;
};

export function AddNoteHero({ player }: AddNoteHeroProps) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>Заметка тренера</Text>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.number}>#{player.number}</Text>
        </View>
        <View style={styles.main}>
          <Text style={styles.name}>{player.name}</Text>
          <Text style={styles.meta}>
            {player.position} · {player.team}
          </Text>
          {player.developmentFocus ? (
            <Text style={styles.context}>Фокус: {player.developmentFocus}</Text>
          ) : null}
        </View>
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
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  main: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  meta: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  context: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
});
