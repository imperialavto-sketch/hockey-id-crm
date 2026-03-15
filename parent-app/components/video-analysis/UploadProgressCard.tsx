import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/theme";

export function UploadProgressCard({ status, progress }: { status: string; progress: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Статус</Text>
      <Text style={styles.status}>{status}</Text>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${Math.max(0, Math.min(progress, 100))}%` }]} />
      </View>
      <Text style={styles.progress}>{Math.round(progress)}%</Text>
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
  title: { ...typography.captionSmall, color: colors.textSecondary, marginBottom: spacing.sm },
  status: { ...typography.body, color: colors.text, fontWeight: "600", marginBottom: spacing.md },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.borderSoft, overflow: "hidden" },
  bar: { height: "100%", backgroundColor: colors.accent },
  progress: { ...typography.captionSmall, color: colors.textMuted, marginTop: spacing.sm },
});
