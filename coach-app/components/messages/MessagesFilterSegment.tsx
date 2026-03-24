import React from 'react';
import { StyleSheet, Text, Pressable, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';

export type MessagesFilterOption = 'all' | 'parents' | 'teams' | 'unread';

type MessagesFilterSegmentProps = {
  value: MessagesFilterOption;
  onChange: (value: MessagesFilterOption) => void;
  counts?: Partial<Record<MessagesFilterOption, number>>;
};

const OPTIONS: { value: MessagesFilterOption; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'parents', label: 'Родители' },
  { value: 'teams', label: 'Команды' },
  { value: 'unread', label: 'Непрочитанные' },
];

export function MessagesFilterSegment({
  value,
  onChange,
  counts,
}: MessagesFilterSegmentProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        const count = counts?.[opt.value];

        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.pill,
              isSelected && styles.pillSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                isSelected && styles.pillTextSelected,
              ]}
            >
              {opt.label}
              {count != null ? ` (${count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {},
  scrollContent: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  pill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
  },
  pillSelected: {
    backgroundColor: theme.colors.primaryMuted,
  },
  pressed: {
    opacity: 0.85,
  },
  pillText: {
    ...theme.typography.subtitle,
    color: theme.colors.textSecondary,
  },
  pillTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
