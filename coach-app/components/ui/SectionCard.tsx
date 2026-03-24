import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type SectionCardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
};

export function SectionCard({ children, style, elevated }: SectionCardProps) {
  return (
    <View style={[styles.card, elevated && theme.shadow.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
});
