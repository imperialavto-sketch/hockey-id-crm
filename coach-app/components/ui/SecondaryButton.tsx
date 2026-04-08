import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
  type AccessibilityProps,
} from 'react-native';
import { theme } from '@/constants/theme';

type SecondaryButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  active?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
} & Pick<AccessibilityProps, 'accessibilityLabel' | 'accessibilityHint' | 'accessibilityRole'>;

const RADIUS = 14;

/** Quiet neutral secondary — no glow, low-contrast chrome */
export function SecondaryButton({
  title,
  onPress,
  disabled = false,
  active = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
}: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.shell,
        active && styles.shellActive,
        disabled && styles.shellDisabled,
        pressed && !disabled && styles.shellPressed,
        style,
      ]}
    >
      <Text style={[styles.text, active && styles.textActive, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingVertical: theme.spacing.md - 2,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  shellActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(200, 220, 240, 0.2)',
  },
  shellDisabled: {
    opacity: 0.45,
  },
  shellPressed: {
    opacity: 0.9,
  },
  text: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '500',
  },
  textActive: {
    color: theme.colors.text,
    fontWeight: '600',
  },
});
