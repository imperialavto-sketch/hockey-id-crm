import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "@/components/ui/PressableScale";
import { colors, buttonStyles } from "@/constants/theme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function PrimaryButton({ label, onPress, disabled, leftIcon, rightIcon }: Props) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} scale={0.97}>
      <LinearGradient
        colors={[colors.accent, colors.accentSecondary]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.button, disabled && styles.disabled]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <Text style={styles.text}>{label}</Text>
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    height: buttonStyles.primary.height,
    borderRadius: buttonStyles.primary.radius,
    paddingHorizontal: buttonStyles.primary.paddingHorizontal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: buttonStyles.primary.shadowColor,
    shadowOpacity: buttonStyles.primary.shadowOpacity,
    shadowRadius: buttonStyles.primary.shadowRadius,
    shadowOffset: buttonStyles.primary.shadowOffset,
    elevation: buttonStyles.primary.elevation,
  },
  disabled: {
    opacity: 0.5,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
