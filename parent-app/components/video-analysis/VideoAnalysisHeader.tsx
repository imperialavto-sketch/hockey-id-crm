import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

export function VideoAnalysisHeader({ playerName }: { playerName: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.player}>{playerName}</Text>
      <Text style={styles.title}>AI Video Analysis</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: spacing.xl, paddingBottom: spacing.md },
  player: { ...typography.heroName, color: colors.text, marginBottom: spacing.xs },
  title: { ...typography.caption, fontSize: 14, color: colors.accent, fontWeight: "700" },
});
