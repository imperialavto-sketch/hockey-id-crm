import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, buttonStyles, typography } from "@/constants/theme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function SecondaryButton({ label, onPress, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: buttonStyles.secondary.height,
    borderRadius: buttonStyles.secondary.radius,
    borderWidth: buttonStyles.secondary.borderWidth,
    borderColor: buttonStyles.secondary.borderColor,
    backgroundColor: buttonStyles.secondary.backgroundColor,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
