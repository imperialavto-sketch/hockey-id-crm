import React, { useEffect } from 'react';
import { DimensionValue, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';

type SkeletonBlockProps = {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function SkeletonBlock({
  width = '100%' as DimensionValue,
  height = 16,
  borderRadius = theme.borderRadius.sm,
  style,
}: SkeletonBlockProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.textMuted,
  },
});
