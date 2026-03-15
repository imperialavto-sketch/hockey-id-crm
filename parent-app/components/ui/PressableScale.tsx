import React from "react";
import { Pressable, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

const DURATION = 180;
const EASE = Easing.out(Easing.cubic);
const SCALE_DOWN = 0.97;

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  scale?: number;
}

/**
 * Press-in scale down, smooth scale up on release.
 * Premium feel without bounce.
 */
export function PressableScale({
  children,
  onPress,
  disabled,
  style,
  scale: scaleDown = SCALE_DOWN,
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) {
          scale.value = withTiming(scaleDown, { duration: DURATION, easing: EASE });
          opacity.value = withTiming(0.98, { duration: DURATION / 2 });
        }
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: DURATION + 40, easing: EASE });
        opacity.value = withTiming(1, { duration: DURATION / 2 });
      }}
      style={style}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}
