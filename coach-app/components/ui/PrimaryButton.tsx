import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';

const PRESS_IN = { duration: 100 };
const SPRING_OUT = { damping: 18, stiffness: 220 };

type PrimaryButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  /** Плавное scale/opacity при нажатии (reanimated). */
  animatedPress?: boolean;
};

export function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
  animatedPress = false,
}: PrimaryButtonProps) {
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (animatedPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          if (disabled) return;
          scale.value = withTiming(0.985, PRESS_IN);
          opacity.value = withTiming(0.93, PRESS_IN);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING_OUT);
          opacity.value = withTiming(1, PRESS_IN);
        }}
      >
        <Animated.View
          style={[
            styles.button,
            isOutline && styles.outline,
            isGhost && styles.ghost,
            disabled && styles.disabled,
            style,
            motionStyle,
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
        </Animated.View>
      </Pressable>
    );
  }

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
