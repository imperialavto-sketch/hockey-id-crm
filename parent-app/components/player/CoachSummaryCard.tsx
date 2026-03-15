import React from "react";
import { colors } from "@/constants/theme";
import { View, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";

export interface CoachSummaryCardProps {
  text: string;
}

export function CoachSummaryCard({ text }: CoachSummaryCardProps) {
  const content = (
    <>
      <View style={styles.iconRow}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>AI</Text>
        </View>
        <Text style={styles.label}>Комментарий AI-тренера</Text>
      </View>
      <Text style={styles.text}>{text}</Text>
    </>
  );

  if (Platform.OS === "web") {
    return (
      <View style={[styles.card, styles.cardWeb]}>
        {content}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <BlurView intensity={40} tint="dark" style={styles.blur}>
        {content}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardWeb: {
    backgroundColor: "rgba(11,18,31,0.95)",
    padding: 20,
  },
  blur: {
    padding: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.accent,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 16,
    color: "#E2E8F0",
    lineHeight: 26,
  },
});
