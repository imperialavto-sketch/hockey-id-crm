import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { colors } from "@/constants/theme";

interface PremiumActionButtonProps {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  variant?: "primary" | "secondary";
}

export function PremiumActionButton({
  label,
  icon: Icon,
  onPress,
  variant = "primary",
}: PremiumActionButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const isPrimary = variant === "primary";

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.button,
          isPrimary ? styles.primary : styles.secondary,
          pressed && styles.pressed,
        ]}
      >
        {isPrimary ? (
          <>
            <LinearGradient
              colors={[colors.accentSoft, colors.accentSoft]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Icon size={22} color={colors.accent} strokeWidth={2.5} />
            <Text style={styles.label}>{label}</Text>
          </>
        ) : (
          <>
            <View style={styles.iconWrap}>
              <Icon size={20} color={colors.textSecondary} strokeWidth={2.5} />
            </View>
            <Text style={[styles.label, styles.labelSecondary]}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  primary: {
    borderColor: colors.border,
  },
  secondary: {
    backgroundColor: colors.glass,
    borderColor: colors.borderLight,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.glassLight,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
    zIndex: 1,
  },
  labelSecondary: {
    color: colors.textSecondary,
  },
});
