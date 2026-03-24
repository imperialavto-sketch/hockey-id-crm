import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';

export type PlayerCardData = {
  id: string;
  name: string;
  number: number;
  position: 'F' | 'D' | 'G';
  team: string;
  teamId?: string;
  teamAgeGroup?: string;
  attendance?: string;
  coachNote?: string;
  focusMarker?: string;
  statusChip?: 'needs-follow-up' | 'improving' | 'top-effort';
  onWatchlist?: boolean;
};

type PlayerCardProps = {
  player: PlayerCardData;
  onPress?: () => void;
  onOpenNotes?: () => void;
  onViewProfile?: () => void;
};

function Chip({
  label,
  variant,
}: {
  label: string;
  variant: 'needs-follow-up' | 'improving' | 'top-effort' | 'muted';
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

function statusLabel(v: PlayerCardData['statusChip']): string | null {
  if (!v) return null;
  if (v === 'needs-follow-up') return 'Требуется контакт';
  if (v === 'improving') return 'Прогресс';
  if (v === 'top-effort') return 'Отличная работа';
  return null;
}

export function PlayerCard({
  player,
  onPress,
  onOpenNotes,
  onViewProfile,
}: PlayerCardProps) {
  const statusLabelText = statusLabel(player.statusChip);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <SectionCard elevated style={styles.card}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.number}>#{player.number}</Text>
          </View>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{player.name}</Text>
              {player.onWatchlist ? (
                <Chip label="В наблюдении" variant="muted" />
              ) : null}
            </View>
            <Text style={styles.meta}>
              {player.position} · {player.team}
            </Text>
          </View>
        </View>

        {player.attendance ? (
          <Text style={styles.attendance}>{player.attendance}</Text>
        ) : null}

        {player.coachNote ? (
          <View style={styles.noteBlock}>
            <Text style={styles.noteLabel}>Заметка тренера</Text>
            <Text style={styles.noteText} numberOfLines={2}>
              {player.coachNote}
            </Text>
          </View>
        ) : null}

        {player.focusMarker ? (
          <Text style={styles.focus}>Фокус: {player.focusMarker}</Text>
        ) : null}

        {statusLabelText ? (
          <View style={styles.statusRow}>
            <Chip label={statusLabelText} variant={player.statusChip!} />
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton
            title="Заметки"
            variant="primary"
            onPress={onOpenNotes ?? onPress}
            style={styles.actionBtn}
          />
          <PrimaryButton
            title="Профиль"
            variant="outline"
            onPress={onViewProfile ?? onPress}
            style={styles.actionBtn}
          />
        </View>
      </SectionCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.lg,
  },
  pressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
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
    ...theme.typography.subtitle,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  meta: {
    ...theme.typography.caption,
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
  attendance: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  noteBlock: {
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.sm,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  noteText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  focus: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  statusRow: {
    marginBottom: theme.spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
