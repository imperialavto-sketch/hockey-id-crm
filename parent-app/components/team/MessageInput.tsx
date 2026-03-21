import React, { useState, useCallback } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send } from "lucide-react-native";
import { colors, spacing, inputStyles } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";

interface MessageInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
}

const PRESSED_OPACITY = 0.9;

export function MessageInput({
  onSend,
  placeholder = "Сообщение...",
}: MessageInputProps) {
  const [text, setText] = useState("");
  const insets = useSafeAreaInsets();

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed) {
      triggerHaptic();
      onSend(trimmed);
      setText("");
    }
  }, [text, onSend]);

  const wrapStyle = [styles.wrap, { paddingBottom: insets.bottom + spacing.lg }];

  return (
    <View style={wrapStyle}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={inputStyles.placeholderColor}
        multiline
        maxLength={500}
        onSubmitEditing={handleSend}
      />
      <Pressable
        style={({ pressed }) => [
          styles.sendBtn,
          pressed && styles.sendBtnPressed,
          !text.trim() && styles.sendBtnDisabled,
        ]}
        onPress={handleSend}
        disabled={!text.trim()}
        accessibilityRole="button"
        accessibilityLabel="Отправить сообщение"
      >
        <Send size={22} color={text.trim() ? colors.onAccent : colors.textMuted} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: colors.bgDeep,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLevel1Border,
    gap: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: inputStyles.backgroundColor,
    borderRadius: inputStyles.radius,
    paddingHorizontal: inputStyles.paddingHorizontal,
    paddingVertical: 16,
    minHeight: 48,
    fontSize: inputStyles.fontSize,
    lineHeight: 23,
    color: colors.textPrimary,
    maxHeight: 100,
    borderWidth: inputStyles.borderWidth,
    borderColor: inputStyles.borderColor,
  },
  sendBtn: {
    width: 48,
    height: 48,
    minWidth: 48,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnPressed: {
    opacity: PRESSED_OPACITY,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceLevel2,
    opacity: 0.5,
  },
});
