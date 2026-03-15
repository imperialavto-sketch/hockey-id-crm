import React, { useState } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { Send } from "lucide-react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";

interface MessageInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  placeholder = "Сообщение...",
}: MessageInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSend(trimmed);
      setText("");
    }
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={500}
        onSubmitEditing={handleSend}
      />
      <Pressable
        style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed]}
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
    padding: spacing[16],
    paddingBottom: spacing[24],
    backgroundColor: "rgba(10,20,40,0.65)",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing[12],
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(10,20,40,0.65)",
    borderRadius: radii.lg,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    ...typography.body,
    color: colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnPressed: {
    opacity: 0.9,
  },
});
