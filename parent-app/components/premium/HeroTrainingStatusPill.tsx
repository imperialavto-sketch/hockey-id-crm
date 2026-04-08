import React, { useEffect } from "react";
import { View, Text, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type Props = {
  label: string;
  isLiveStyle: boolean;
  /** Доп. стиль оболочки pill (из экрана / темы) */
  containerStyle?: StyleProp<ViewStyle>;
  /** Доп. стиль текста */
  textStyle?: StyleProp<TextStyle>;
};

/**
 * Верхний status pill hero: опциональный live-dot с мягкой пульсацией для broadcast-состояний.
 */
export function HeroTrainingStatusPill({
  label,
  isLiveStyle,
  containerStyle,
  textStyle,
}: Props) {
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    if (isLiveStyle) {
      dotOpacity.value = withRepeat(
        withSequence(
          withTiming(0.38, { duration: 880 }),
          withTiming(1, { duration: 880 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(dotOpacity);
      dotOpacity.value = 1;
    }
    return () => {
      cancelAnimation(dotOpacity);
    };
  }, [isLiveStyle, dotOpacity]);

  const dotAnimated = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <View style={[styles.row, containerStyle]}>
      {isLiveStyle ? <Animated.View style={[styles.liveDot, dotAnimated]} /> : null}
      <Text style={[styles.labelBase, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(248, 113, 113, 0.95)",
    flexShrink: 0,
  },
  labelBase: {
    flexShrink: 1,
  },
});
