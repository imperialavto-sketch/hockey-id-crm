import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { cardStyles, cardEmphasized, spacing, shadows } from "@/constants/theme";

const EASE = Easing.out(Easing.cubic);

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
  /** Use for primary/hero cards */
  emphasized?: boolean;
};

export function PremiumCard({ children, onPress, style, emphasized }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardContent = (
    <View style={[styles.card, emphasized && styles.cardEmphasized, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 160, easing: EASE });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 220, easing: EASE });
        }}
        style={({ pressed }) => pressed && styles.pressedOpacity}
      >
        <Animated.View style={animatedStyle}>{cardContent}</Animated.View>
      </Pressable>
    );
  }
  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cardStyles.backgroundColor,
    borderRadius: cardStyles.radius,
    padding: cardStyles.padding,
    marginBottom: spacing.lg,
    borderWidth: cardStyles.borderWidth,
    borderColor: cardStyles.borderColor,
    ...shadows.level1,
  },
  cardEmphasized: {
    backgroundColor: cardEmphasized.backgroundColor,
    borderColor: cardEmphasized.borderColor,
    ...shadows.level2,
  },
  pressedOpacity: { opacity: 0.92 },
});
