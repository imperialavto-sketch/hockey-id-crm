/**
 * Упрощённый stub для Storybook (Vite + react-native-web): убирает layout-анимации entering.
 */
import * as React from "react";
import { View, Text, ViewProps, TextProps } from "react-native";

const chain = {
  delay: () => chain,
  duration: () => chain,
  springify: () => chain,
  damping: (_n: number) => ({}),
};

export const FadeInUp = {
  delay: () => chain,
  duration: () => chain,
  springify: () => chain,
  damping: () => ({}),
};

export const FadeInDown = FadeInUp;
export const FadeIn = FadeInUp;

export const Animated = {
  View: ({ entering: _e, ...props }: ViewProps & { entering?: unknown }) =>
    React.createElement(View, props),
  Text: ({ ...props }: TextProps) => React.createElement(Text, props),
};

export function useSharedValue(v: number) {
  return { value: v };
}

export function useAnimatedStyle(fn: () => Record<string, unknown>) {
  return fn();
}

export function withTiming(v: number) {
  return v;
}

export function withRepeat(v: unknown) {
  return v;
}

export function withSequence(...args: unknown[]) {
  return args[0];
}

export function interpolate(_v: number, _i: number[], o: number[]) {
  return o[Math.min(1, o.length - 1)] ?? 0;
}

const _default = Animated;
export default _default;
