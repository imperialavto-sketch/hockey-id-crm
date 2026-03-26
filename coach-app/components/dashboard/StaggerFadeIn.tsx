import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type StaggerFadeInProps = {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  /** Повторный вход при смене ключа (например id черновика). */
  revealKey?: string | number;
  /** Длительность fade opacity, ms */
  duration?: number;
  /** Стартовый сдвиг по Y */
  translateFrom?: number;
  /** Быстрый пресет для главных экранов */
  preset?: 'default' | 'snappy';
};

const PRESETS = {
  default: {
    duration: 400,
    translateFrom: 12,
    spring: { damping: 18, stiffness: 120 },
  },
  snappy: {
    duration: 280,
    translateFrom: 8,
    spring: { damping: 20, stiffness: 160 },
  },
} as const;

export function StaggerFadeIn({
  children,
  delay = 0,
  style,
  revealKey = 0,
  duration,
  translateFrom,
  preset = 'default',
}: StaggerFadeInProps) {
  const p = PRESETS[preset];
  const dur = duration ?? p.duration;
  const fromY = translateFrom ?? p.translateFrom;
  const springCfg = p.spring;

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(fromY);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = fromY;
    opacity.value = withDelay(delay, withTiming(1, { duration: dur }));
    translateY.value = withDelay(delay, withSpring(0, springCfg));
  }, [revealKey, delay, dur, fromY, springCfg.damping, springCfg.stiffness]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
