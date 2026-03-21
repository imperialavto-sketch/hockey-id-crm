import React from "react";
import { TextInput, TextInputProps, StyleSheet, ViewStyle } from "react-native";
import { colors, inputStyles } from "@/constants/theme";

type Props = TextInputProps & {
  error?: boolean;
  multiline?: boolean;
  style?: ViewStyle;
};

/**
 * Unified input field — uses theme inputStyles.
 * Height 48, radius 14, consistent border/background/placeholder.
 */
export function Input({
  error,
  multiline,
  style,
  placeholderTextColor = inputStyles.placeholderColor,
  ...props
}: Props) {
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor}
      style={[
        styles.input,
        multiline && styles.multiline,
        error && styles.inputError,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: inputStyles.backgroundColor,
    borderRadius: inputStyles.radius,
    paddingHorizontal: inputStyles.paddingHorizontal,
    paddingVertical: inputStyles.paddingVertical,
    minHeight: inputStyles.minHeight,
    fontSize: inputStyles.fontSize,
    color: colors.textPrimary,
    borderWidth: inputStyles.borderWidth,
    borderColor: inputStyles.borderColor,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: inputStyles.borderColorError,
  },
});
