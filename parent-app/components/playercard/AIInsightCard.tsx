import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles } from "lucide-react-native";
import { GlassCard } from "@/components/shared/GlassCard";
import { colors } from "@/constants/theme";

interface AIInsightCardProps {
  text: string;
}

export function AIInsightCard({ text }: AIInsightCardProps) {
  return (
    <GlassCard variant="subtle" style={styles.card}>
      <View style={styles.edgeGlow} />
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <LinearGradient
            colors={[colors.accentSoft, "rgba(37,99,235,0.25)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Sparkles size={20} color="#7dd3fc" strokeWidth={2.5} />
        </View>
        <Text style={styles.label}>AI Insight</Text>
      </View>
      <Text style={styles.text}>{text}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 28,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  edgeGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.accent,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#7dd3fc",
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(148,163,184,0.95)",
    lineHeight: 24,
    letterSpacing: 0.05,
  },
});
