import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { PlayerDetailData, PlayerStatusChip } from '@/constants/playerDetailData';
import { COACH_PLAYER_DETAIL_COPY } from '@/lib/coachPlayerDetailUi';

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
  /** Компактная метрика под идентичностью (посещаемость, тренировки и т.д.) */
  keyMetric?: { label: string; value: string } | null;
  /** Одна строка про очередь задач / фокус без перегруза */
  queueHint?: string | null;
};

export function PlayerDetailHero({ player, keyMetric, queueHint }: PlayerDetailHeroProps) {
  const statusText = statusLabel(player.statusChip);

  return (
    <View style={styles.hero}>
      <Text style={styles.heroEyebrow}>{COACH_PLAYER_DETAIL_COPY.heroEyebrow}</Text>
      <View style={styles.cardShell}>
        <View style={styles.cardAccent} />
        <View style={styles.cardInner}>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.number}>#{player.number}</Text>
            </View>
            <View style={styles.main}>
              <Text style={styles.name} numberOfLines={2}>
                {player.name}
              </Text>
              <Text style={styles.meta} numberOfLines={2}>
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
              {queueHint ? (
                <Text style={styles.queueHint} numberOfLines={2}>
                  {queueHint}
                </Text>
              ) : null}
            </View>
          </View>

          {keyMetric ? (
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>{keyMetric.label}</Text>
              <Text style={styles.metricValue} numberOfLines={1}>
                {keyMetric.value}
              </Text>
            </View>
          ) : null}

          {player.coachSummary ? (
            <Text style={styles.summary} numberOfLines={4}>
              {player.coachSummary}
            </Text>
          ) : (
            <Text style={styles.summaryPlaceholder} numberOfLines={3}>
              {COACH_PLAYER_DETAIL_COPY.summaryPlaceholder}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: theme.layout.heroBottom,
  },
  heroEyebrow: {
    ...theme.typography.heroEyebrow,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  cardShell: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardAccent: {
    width: 4,
    backgroundColor: theme.colors.primary,
    opacity: 0.85,
  },
  cardInner: {
    flex: 1,
    minWidth: 0,
    padding: theme.spacing.md,
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
    ...theme.typography.hero,
    fontSize: 26,
    lineHeight: 32,
    color: theme.colors.text,
  },
  meta: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  queueHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    flex: 1,
    minWidth: 0,
  },
  metricValue: {
    ...theme.typography.subtitle,
    color: theme.colors.primary,
    fontWeight: '700',
    flexShrink: 0,
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
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  summaryPlaceholder: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
    fontStyle: 'italic',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
