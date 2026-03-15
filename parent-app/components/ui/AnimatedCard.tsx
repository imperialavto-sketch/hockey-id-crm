import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Pressable } from "react-native";

const DURATION = 520;
const TRANSLATE_Y = 16;
const EASE = Easing.out(Easing.cubic);
const SCALE_DOWN = 0.98;

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  onPress?: () => void;
  style?: ViewStyle;
  /** Optional glow for hero cards */
  glow?: boolean;
}

/**
 * Card with enter animation (fade + translateY) and optional press scale.
 */
export function AnimatedCard({
  children,
  index = 0,
  onPress,
  style,
  glow = false,
}: AnimatedCardProps) {
  const scale = useSharedValue(1);

  const entering = FadeInUp.delay(index * 60)
    .duration(DURATION)
    .easing(EASE);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withTiming(SCALE_DOWN, { duration: 150, easing: EASE });
    }
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 220, easing: EASE });
  };

  const content = (
    <Animated.View entering={entering} style={[styles.wrap, glow && styles.glow]}>
      {onPress ? (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
          <Animated.View style={pressStyle}>{children}</Animated.View>
        </Pressable>
      ) : (
        children
      )}
    </Animated.View>
  );

  return <View style={[styles.container, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {},
  wrap: {},
  glow: {
    shadowColor: "#3B82F6",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
