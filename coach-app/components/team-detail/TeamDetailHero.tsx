import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { TeamDetailData } from '@/constants/teamDetailData';

function Chip({
  label,
  variant = 'muted',
}: {
  label: string;
  variant?: 'primary' | 'accent' | 'muted';
}) {
  const config =
    variant === 'primary'
      ? { bg: theme.colors.primaryMuted, color: theme.colors.primary }
      : variant === 'accent'
        ? { bg: theme.colors.accentMuted, color: theme.colors.accent }
        : { bg: theme.colors.surfaceElevated, color: theme.colors.textSecondary };

  return (
    <View style={[styles.chip, { backgroundColor: config.bg }]}>
      <Text style={[styles.chipText, { color: config.color }]}>{label}</Text>
    </View>
  );
}

type TeamDetailHeroProps = {
  team: TeamDetailData;
};

export function TeamDetailHero({ team }: TeamDetailHeroProps) {
  const variant = team.levelVariant ?? 'primary';

  return (
    <View style={styles.hero}>
      <View style={styles.header}>
        <View style={styles.main}>
          <Text style={styles.name}>{team.name}</Text>
          <View style={styles.metaRow}>
            <Chip label={team.level} variant={variant} />
            {team.ageGroup ? (
              <Text style={styles.age}>{team.ageGroup}</Text>
            ) : null}
          </View>
          <Text style={styles.playerCount}>{team.playerCount} players</Text>
        </View>
      </View>
      {team.coachSummary ? (
        <Text style={styles.summary}>{team.coachSummary}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  main: {
    gap: theme.spacing.sm,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: theme.colors.text,
    lineHeight: 34,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  age: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
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
  playerCount: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
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
