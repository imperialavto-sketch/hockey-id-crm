import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { coachHapticLight } from "@/lib/coachHaptics";

const PRESS_TIMING = { duration: 100 };
const SPRING = { damping: 18, stiffness: 220 };

type PressableFeedbackProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** Лёгкий haptic при касании (Android) */
  hapticOnPress?: boolean;
};

export function PressableFeedback({
  children,
  onPress,
  style,
  disabled,
  hapticOnPress,
}: PressableFeedbackProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.985, PRESS_TIMING);
        opacity.value = withTiming(0.92, PRESS_TIMING);
        if (hapticOnPress) coachHapticLight();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
        opacity.value = withTiming(1, PRESS_TIMING);
      }}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
