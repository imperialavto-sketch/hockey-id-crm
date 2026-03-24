import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type DashboardSectionProps = {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Тайтовый отступ для сгруппированных секций */
  compact?: boolean;
};

export function DashboardSection({ title, children, style, compact }: DashboardSectionProps) {
  return (
    <View style={[styles.section, compact && styles.sectionCompact, style]}>
      <Text style={styles.header}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionCompact: {
    marginBottom: theme.spacing.md,
  },
  header: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
});
