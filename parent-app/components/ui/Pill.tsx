import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, typography, radii } from "@/constants/theme";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function Pill({ label, active, onPress }: Props) {
  const content = (
    <View style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: radii.lg,
    backgroundColor: colors.glassLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pillActive: {
    backgroundColor: "rgba(46,167,255,0.15)",
    borderColor: "rgba(46,167,255,0.4)",
  },
  text: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  textActive: {
    color: colors.accent,
    fontWeight: "600",
  },
  pressed: { opacity: 0.8 },
});
