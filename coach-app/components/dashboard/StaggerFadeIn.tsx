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
};

const springConfig = { damping: 18, stiffness: 120 };

export function StaggerFadeIn({ children, delay = 0, style }: StaggerFadeInProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 400 })
    );
    translateY.value = withDelay(
      delay,
      withSpring(0, springConfig)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
