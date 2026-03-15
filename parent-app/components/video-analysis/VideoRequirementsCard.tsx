import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/theme";

export function VideoRequirementsCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Требования к видео</Text>
      <Text style={styles.item}>• Формат: MP4</Text>
      <Text style={styles.item}>• Рекомендовано: до 45 секунд</Text>
      <Text style={styles.item}>• Максимум: 60 секунд</Text>
      <Text style={styles.item}>• Рекомендовано: до 100 МБ</Text>
      <Text style={styles.item}>• Максимум: 150 МБ</Text>
      <Text style={styles.note}>Лучше загружать один игровой эпизод</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.glass,
  },
  title: { ...typography.cardTitle, color: colors.text, marginBottom: spacing.md },
  item: { ...typography.bodySmall, color: colors.text, marginBottom: spacing.sm },
  note: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
});
