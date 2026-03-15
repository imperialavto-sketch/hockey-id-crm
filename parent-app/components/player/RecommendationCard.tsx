import React from "react";
import { colors } from "@/constants/theme";
import { View, Text, StyleSheet } from "react-native";
import type { RecommendationPriority } from "@/constants/mockAiReport";

export interface RecommendationCardProps {
  title: string;
  description: string;
  priority: RecommendationPriority;
  expectedEffect: string;
}

const PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  high: "Высокий",
  medium: "Средний",
};

export function RecommendationCard({
  title,
  description,
  priority,
  expectedEffect,
}: RecommendationCardProps) {
  const isHigh = priority === "high";

  return (
    <View style={[styles.card, isHigh ? styles.cardHigh : styles.cardMedium]}>
      <View style={styles.badgeWrap}>
        <View style={[styles.badge, isHigh ? styles.badgeHigh : styles.badgeMedium]}>
          <Text style={[styles.badgeText, isHigh ? styles.badgeTextHigh : styles.badgeTextMedium]}>
            {PRIORITY_LABELS[priority]}
          </Text>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.effectWrap}>
        <Text style={styles.effectLabel}>Ожидаемый эффект:</Text>
        <Text style={styles.effectValue}>{expectedEffect}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHigh: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
  },
  cardMedium: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  badgeWrap: {
    flexDirection: "row",
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeHigh: {
    backgroundColor: colors.accentSoft,
  },
  badgeMedium: {
    backgroundColor: "rgba(148,163,184,0.2)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  badgeTextHigh: {
    color: colors.accent,
  },
  badgeTextMedium: {
    color: "#94A3B8",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 21,
    marginBottom: 12,
  },
  effectWrap: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  effectLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  effectValue: {
    fontSize: 13,
    color: "#E2E8F0",
    lineHeight: 19,
  },
});
