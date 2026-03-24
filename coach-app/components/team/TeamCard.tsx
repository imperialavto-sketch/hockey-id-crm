import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';

export type TeamCardData = {
  id: string;
  name: string;
  level: string;
  levelVariant?: 'primary' | 'accent' | 'muted';
  playerCount: number;
  nextSession: string;
  venue?: string;
  confirmed: number;
  expected: number;
  unreadMessages?: number;
  hasAnnouncement?: boolean;
};

type TeamCardProps = {
  team: TeamCardData;
  onPress?: () => void;
  onOpenHub?: () => void;
  onManageRoster?: () => void;
};

function Chip({
  label,
  variant = 'muted',
}: {
  label: string;
  variant?: 'primary' | 'accent' | 'muted';
}) {
  const bgColor =
    variant === 'primary'
      ? theme.colors.primaryMuted
      : variant === 'accent'
        ? theme.colors.accentMuted
        : theme.colors.surfaceElevated;
  const textColor =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'accent'
        ? theme.colors.accent
        : theme.colors.textSecondary;

  return (
    <View style={[styles.chip, { backgroundColor: bgColor }]}>
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export function TeamCard({
  team,
  onPress,
  onOpenHub,
  onManageRoster,
}: TeamCardProps) {
  const levelVariant = team.levelVariant ?? 'primary';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <SectionCard elevated style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.teamName}>{team.name}</Text>
            <Chip label={team.level} variant={levelVariant} />
          </View>
          <Text style={styles.playerCount}>{team.playerCount} игроков</Text>
        </View>

        <View style={styles.nextSession}>
          <Text style={styles.nextSessionLabel}>Ближайшая тренировка</Text>
          <Text style={styles.nextSessionTime}>{team.nextSession}</Text>
          {team.venue ? (
            <Text style={styles.venue}>{team.venue}</Text>
          ) : null}
        </View>

        <View style={styles.attendance}>
          <Text style={styles.attendanceText}>
            <Text style={styles.attendanceConfirmed}>{team.confirmed}</Text>
            <Text style={styles.attendanceSlash}>/{team.expected}</Text>
            <Text style={styles.attendanceLabel}> подтверждено</Text>
          </Text>
        </View>

        {(team.unreadMessages ?? 0) > 0 || team.hasAnnouncement ? (
          <View style={styles.statusRow}>
            {team.unreadMessages ? (
              <Chip label={`${team.unreadMessages} новых`} variant="accent" />
            ) : null}
            {team.hasAnnouncement ? (
              <Chip label="Объявление" variant="muted" />
            ) : null}
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton
            title="Подробнее"
            variant="primary"
            onPress={onOpenHub ?? onPress}
            style={styles.actionBtn}
          />
          <PrimaryButton
            title="Управление ростером"
            variant="outline"
            onPress={onManageRoster ?? onPress}
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
    marginBottom: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  teamName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  playerCount: {
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
  nextSession: {
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.sm,
  },
  nextSessionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  nextSessionTime: {
    ...theme.typography.subtitle,
    color: theme.colors.primary,
  },
  venue: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  attendance: {
    marginBottom: theme.spacing.md,
  },
  attendanceText: {
    ...theme.typography.body,
  },
  attendanceConfirmed: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  attendanceSlash: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  attendanceLabel: {
    color: theme.colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
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
