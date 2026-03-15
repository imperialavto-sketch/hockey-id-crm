import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

export function AnalysisInsightCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {items.map((item, idx) => (
        <View key={`${title}-${idx}`} style={styles.row}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xl,
    borderRadius: 20,
    padding: spacing.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  title: { ...typography.cardTitle, color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.sm },
  bullet: { color: colors.accent, marginRight: spacing.sm, marginTop: 1 },
  text: { ...typography.bodySmall, color: colors.text, flex: 1, lineHeight: 21 },
});
