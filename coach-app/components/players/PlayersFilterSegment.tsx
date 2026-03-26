import React from 'react';
import { StyleSheet, Text, Pressable, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';

/** Filter by all, age group (from teamAgeGroup), or watchlist. */
export type FilterOption = 'all' | 'watchlist' | `age:${string}`;

export interface FilterOptionItem {
  value: FilterOption;
  label: string;
  count?: number;
}

type PlayersFilterSegmentProps = {
  value: FilterOption;
  onChange: (value: FilterOption) => void;
  options: FilterOptionItem[];
};

export function PlayersFilterSegment({
  value,
  onChange,
  options,
}: PlayersFilterSegmentProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;

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
              {opt.count != null ? ` (${opt.count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: theme.spacing.md,
  },
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
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  pillSelected: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
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
