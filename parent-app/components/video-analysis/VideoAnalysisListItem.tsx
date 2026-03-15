import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";
import { AnalysisStatusBadge } from "./AnalysisStatusBadge";
import type { VideoAnalysisRequest } from "@/types/video-analysis";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function VideoAnalysisListItem(props: {
  item: VideoAnalysisRequest;
  summary?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={props.onPress}>
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={1}>
          {props.item.title || "Видео анализ"}
        </Text>
        <AnalysisStatusBadge status={props.item.analysisStatus} />
      </View>
      <Text style={styles.summary} numberOfLines={2}>
        {props.summary || "Видео анализируется или ожидает результат"}
      </Text>
      <Text style={styles.date}>{formatDate(props.item.createdAt)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    borderRadius: 20,
    padding: spacing.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pressed: { opacity: 0.88 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  title: { ...typography.cardTitle, color: colors.text, flex: 1, marginRight: spacing.sm },
  summary: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
  date: { ...typography.captionSmall, color: colors.textMuted, marginTop: spacing.sm },
});
