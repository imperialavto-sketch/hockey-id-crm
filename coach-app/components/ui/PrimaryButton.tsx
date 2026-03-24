import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '@/constants/theme';

type PrimaryButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}: PrimaryButtonProps) {
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isOutline && styles.outline,
        isGhost && styles.ghost,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          isOutline && styles.outlineText,
          isGhost && styles.ghostText,
          disabled && styles.disabledText,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  ghost: {
    backgroundColor: theme.colors.primaryMuted,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    color: theme.colors.background,
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: theme.typography.subtitle.fontWeight,
  },
  outlineText: {
    color: theme.colors.primary,
  },
  ghostText: {
    color: theme.colors.primary,
  },
  disabledText: {
    color: theme.colors.textMuted,
  },
});
