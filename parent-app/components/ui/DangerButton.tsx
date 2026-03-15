import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, buttonStyles } from "@/constants/theme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function DangerButton({ label, onPress, disabled }: Props) {
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
    height: buttonStyles.danger.height,
    borderRadius: buttonStyles.danger.radius,
    borderWidth: buttonStyles.danger.borderWidth,
    borderColor: buttonStyles.danger.borderColor,
    backgroundColor: buttonStyles.danger.backgroundColor,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.9 },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.errorText,
  },
});
