import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "@/components/ui/PressableScale";
import { colors, typography } from "@/constants/theme";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
};

/**
 * Unified button: height 48, borderRadius 14, paddingHorizontal 20.
 */
export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled,
}: Props) {
  const content = (
    <Text style={[styles.text, variant === "primary" && styles.textPrimary]}>
      {label}
    </Text>
  );

  if (variant === "primary") {
    return (
      <PressableScale onPress={onPress} disabled={disabled} scale={0.97}>
        <LinearGradient
          colors={[colors.accent, colors.accentSecondary]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.button, styles.primary, disabled && styles.disabled]}
        >
          {content}
        </LinearGradient>
      </PressableScale>
    );
  }

  if (variant === "secondary") {
    return (
      <PressableScale onPress={onPress} disabled={disabled} scale={0.97}>
        <View style={[styles.button, styles.secondary, disabled && styles.disabled]}>
          {content}
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale onPress={onPress} disabled={disabled} scale={0.97}>
      <View style={[styles.button, styles.ghost, disabled && styles.disabled]}>
        {content}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  textPrimary: {
    color: "#FFFFFF",
  },
});
