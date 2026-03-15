import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, buttonStyles } from "@/constants/theme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function GhostButton({ label, onPress, disabled }: Props) {
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
    height: buttonStyles.ghost.height,
    borderRadius: buttonStyles.ghost.radius,
    backgroundColor: "transparent",
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.accent,
  },
});
