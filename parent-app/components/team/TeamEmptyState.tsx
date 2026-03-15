import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { colors, spacing, typography } from "@/constants/theme";

interface TeamEmptyStateProps {
  title?: string;
  subtitle?: string;
}

export function TeamEmptyState({
  title = "Пока нет сообщений",
  subtitle = "Напишите первым",
}: TeamEmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <MessageCircle size={48} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[24],
  },
  iconWrap: {
    marginBottom: spacing[20],
    opacity: 0.5,
  },
  title: {
    ...typography.section,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing[8],
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
  },
});
