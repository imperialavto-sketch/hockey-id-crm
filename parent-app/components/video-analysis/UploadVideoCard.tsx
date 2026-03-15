import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants/theme";

export function UploadVideoCard(props: {
  onPickGallery: () => void;
  onRecord: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Выбор видео</Text>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, props.disabled && styles.disabled]}
        onPress={props.onPickGallery}
        disabled={props.disabled}
      >
        <Ionicons name="images-outline" size={20} color={colors.accent} />
        <Text style={styles.btnText}>Выбрать из галереи</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, props.disabled && styles.disabled]}
        onPress={props.onRecord}
        disabled={props.disabled}
      >
        <Ionicons name="videocam-outline" size={20} color={colors.accent} />
        <Text style={styles.btnText}>Снять видео</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  title: { ...typography.cardTitle, color: colors.text, marginBottom: spacing.md },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.sm,
  },
  btnText: { ...typography.body, color: colors.accent, fontWeight: "600" },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.6 },
});
