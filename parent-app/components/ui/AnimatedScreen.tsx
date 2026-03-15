import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Easing } from "react-native-reanimated";

const DURATION = 580;
const STAGGER_DELAY = 55;
const EASE = Easing.out(Easing.cubic);

interface AnimatedScreenProps {
  children: React.ReactNode;
}

/**
 * Screen enter: fade + slight translateY (content slides up into view).
 */
export function AnimatedScreen({ children }: AnimatedScreenProps) {
  const entering = FadeInUp.duration(DURATION).easing(EASE);

  return (
    <Animated.View entering={entering} style={styles.container}>
      {children}
    </Animated.View>
  );
}

/**
 * Stagger item — delay based on index for cascade effect.
 */
export function AnimatedScreenItem({
  children,
  index = 0,
}: {
  children: React.ReactNode;
  index?: number;
}) {
  const entering = FadeInUp.delay(index * STAGGER_DELAY)
    .duration(DURATION - 80)
    .easing(EASE);

  return <Animated.View entering={entering}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
