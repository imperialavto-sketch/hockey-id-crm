import React, { useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width - 48, 340);
const CARD_HEIGHT = CARD_WIDTH * 1.4;

const TILT_MAX_Y = 5;
const TILT_MAX_X = 2;

interface PlayerCardHeroProps {
  children: React.ReactNode;
  animated?: boolean;
  glowColor?: string;
}

export function PlayerCardHero({
  children,
  animated = true,
  glowColor = "rgba(59,130,246,0.25)",
}: PlayerCardHeroProps) {
  const scale = useSharedValue(animated ? 0.9 : 1);
  const opacity = useSharedValue(animated ? 0 : 1);
  const translateY = useSharedValue(animated ? 24 : 0);
  const rotationY = useSharedValue(0);
  const rotationX = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (!animated) return;
    scale.value = withSpring(1, { damping: 18, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 600 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 120 });
    glowOpacity.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(0.75, { duration: 2200 }),
          withTiming(0.4, { duration: 2200 })
        ),
        -1,
        true
      )
    );
  }, [animated]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 5 || Math.abs(dy) > 5;
      },
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const rotY = Math.max(-TILT_MAX_Y, Math.min(TILT_MAX_Y, dx / 20));
        const rotX = Math.max(-TILT_MAX_X, Math.min(TILT_MAX_X, -dy / 40));
        rotationY.value = rotY;
        rotationX.value = rotX;
      },
      onPanResponderRelease: () => {
        rotationY.value = withSpring(0, { damping: 15, stiffness: 120 });
        rotationX.value = withSpring(0, { damping: 15, stiffness: 120 });
      },
    })
  ).current;

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { perspective: 1200 },
      { scale: scale.value },
      { translateY: translateY.value },
      { rotateY: `${rotationY.value}deg` },
      { rotateX: `${rotationX.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.glowWrap}>
        <Animated.View
          style={[styles.glow, glowStyle, { backgroundColor: glowColor }]}
        />
      </View>
      <Animated.View style={[styles.cardWrap, cardStyle]} pointerEvents="box-none">
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  glowWrap: {
    position: "absolute",
    width: CARD_WIDTH + 100,
    height: CARD_HEIGHT + 100,
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  cardWrap: {
    width: CARD_WIDTH,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 16,
  },
});
