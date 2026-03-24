import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { theme } from '@/constants/theme';

type HeroTitleProps = {
  title: string;
  style?: TextStyle;
};

export function HeroTitle({ title, style }: HeroTitleProps) {
  return <Text style={[styles.hero, style]}>{title}</Text>;
}

const styles = StyleSheet.create({
  hero: {
    ...theme.typography.hero,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
});
