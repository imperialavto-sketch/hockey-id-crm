import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { PlayerDetailData, PlayerStatusChip } from '@/constants/playerDetailData';

function Chip({
  label,
  variant,
}: {
  label: string;
  variant: PlayerStatusChip | 'watchlist' | 'muted';
}) {
  const config =
    variant === 'needs-follow-up'
      ? { bg: 'rgba(245, 166, 35, 0.15)', color: theme.colors.warning }
      : variant === 'improving' || variant === 'top-effort'
        ? { bg: theme.colors.primaryMuted, color: theme.colors.primary }
        : { bg: theme.colors.surfaceElevated, color: theme.colors.textSecondary };

  return (
    <View style={[styles.chip, { backgroundColor: config.bg }]}>
      <Text style={[styles.chipText, { color: config.color }]}>{label}</Text>
    </View>
  );
}

function statusLabel(v: PlayerStatusChip | undefined): string | null {
  if (!v) return null;
  if (v === 'needs-follow-up') return 'Требуется контакт';
  if (v === 'improving') return 'Прогресс';
  if (v === 'top-effort') return 'Отличная работа';
  return null;
}

type PlayerDetailHeroProps = {
  player: PlayerDetailData;
};

export function PlayerDetailHero({ player }: PlayerDetailHeroProps) {
  const statusText = statusLabel(player.statusChip);

  return (
    <View style={styles.hero}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.number}>#{player.number}</Text>
        </View>
        <View style={styles.main}>
          <Text style={styles.name}>{player.name}</Text>
          <Text style={styles.meta}>
            {player.position} · {player.team} · {player.level}
          </Text>
          <View style={styles.chips}>
            {statusText ? (
              <Chip label={statusText} variant={player.statusChip!} />
            ) : null}
            {player.onWatchlist ? (
              <Chip label="В наблюдении" variant="watchlist" />
            ) : null}
          </View>
        </View>
      </View>
      {player.coachSummary ? (
        <Text style={styles.summary}>{player.coachSummary}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: theme.spacing.xl,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  main: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  meta: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  summary: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
  },
});
