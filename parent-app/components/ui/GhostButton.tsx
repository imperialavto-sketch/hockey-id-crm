import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { colors, buttonStyles, feedback } from "@/constants/theme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function GhostButton({ label, onPress, disabled, leftIcon, rightIcon }: Props) {
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
      {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
      <Text style={styles.text}>{label}</Text>
      {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: buttonStyles.ghost.height,
    borderRadius: buttonStyles.ghost.radius,
    paddingHorizontal: buttonStyles.ghost.paddingHorizontal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: feedback.pressedOpacity },
  leftIcon: { marginRight: 8 },
  rightIcon: { marginLeft: 8 },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.accent,
  },
});
