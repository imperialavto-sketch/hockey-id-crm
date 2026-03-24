import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { theme } from '@/constants/theme';
import type { AttendanceStatus } from '@/constants/attendanceData';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Был' },
  { value: 'late', label: 'Опоздал' },
  { value: 'absent', label: 'Нет' },
  { value: 'excused', label: 'Уваж.' },
];

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { bg: string; color: string; selectedBg: string }
> = {
  present: {
    bg: theme.colors.surfaceElevated,
    color: theme.colors.textSecondary,
    selectedBg: theme.colors.primaryMuted,
  },
  late: {
    bg: theme.colors.surfaceElevated,
    color: theme.colors.textSecondary,
    selectedBg: 'rgba(245, 166, 35, 0.2)',
  },
  absent: {
    bg: theme.colors.surfaceElevated,
    color: theme.colors.textSecondary,
    selectedBg: 'rgba(255, 77, 106, 0.15)',
  },
  excused: {
    bg: theme.colors.surfaceElevated,
    color: theme.colors.textSecondary,
    selectedBg: theme.colors.accentMuted,
  },
};

type PlayerAttendanceRowProps = {
  playerId: string;
  name: string;
  number: number;
  position: string;
  status: AttendanceStatus;
  onStatusChange: (playerId: string, status: AttendanceStatus) => void;
  isLast?: boolean;
};

export function PlayerAttendanceRow({
  playerId,
  name,
  number,
  position,
  status,
  onStatusChange,
  isLast,
}: PlayerAttendanceRowProps) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.player}>
        <View style={styles.avatar}>
          <Text style={styles.number}>#{number}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.position}>{position}</Text>
        </View>
      </View>
      <View style={styles.pills}>
        {STATUS_OPTIONS.map((opt) => {
          const isSelected = status === opt.value;
          const config = STATUS_CONFIG[opt.value];
          const bg = isSelected ? config.selectedBg : config.bg;
          const color = isSelected
            ? opt.value === 'present'
              ? theme.colors.primary
              : opt.value === 'late'
                ? theme.colors.warning
                : opt.value === 'absent'
                  ? theme.colors.error
                  : theme.colors.accent
            : config.color;

          return (
            <Pressable
              key={opt.value}
              onPress={() => onStatusChange(playerId, opt.value)}
              style={({ pressed }) => [
                styles.pill,
                { backgroundColor: bg },
                pressed && styles.pillPressed,
              ]}
            >
              <Text style={[styles.pillText, { color }]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    fontSize: 15,
  },
  position: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  pill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  pillPressed: {
    opacity: 0.8,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
