import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { shadows, radius } from "@/constants/theme";

export interface StrengthWeaknessCardProps {
  type: "strength" | "weakness";
  title: string;
  explanation: string;
  score: number;
  maxScore: number;
  /** Only for weakness: what to improve */
  action?: string;
  /** Only for weakness: short problem label */
  problem?: string;
}

export function StrengthWeaknessCard({
  type,
  title,
  explanation,
  score,
  maxScore,
  action,
  problem,
}: StrengthWeaknessCardProps) {
  const pct = Math.min(100, Math.round((score / maxScore) * 100));
  const isStrength = type === "strength";

  return (
    <View style={[styles.card, isStrength ? styles.cardStrength : styles.cardWeakness]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.score, isStrength ? styles.scoreStrong : styles.scoreWeak]}>
          {score}/{maxScore}
        </Text>
      </View>
      <Text style={styles.explanation}>{explanation}</Text>
      {!isStrength && problem ? (
        <Text style={styles.problem}>{problem}</Text>
      ) : null}
      <View style={styles.barWrap}>
        <View style={[styles.barBg, isStrength ? styles.barBgStrong : styles.barBgWeak]}>
          <View
            style={[
              styles.barFill,
              isStrength ? styles.barFillStrong : styles.barFillWeak,
              { width: `${pct}%` },
            ]}
          />
        </View>
      </View>
      {!isStrength && action ? (
        <Text style={styles.action}>Что улучшить: {action}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    ...shadows.level1,
  },
  cardStrength: {
    backgroundColor: "rgba(34,197,94,0.06)",
    borderColor: "rgba(34,197,94,0.25)",
  },
  cardWeakness: {
    backgroundColor: "rgba(251,191,36,0.06)",
    borderColor: "rgba(251,191,36,0.25)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  score: {
    fontSize: 15,
    fontWeight: "800",
  },
  scoreStrong: {
    color: "#22C55E",
  },
  scoreWeak: {
    color: "#FBBF24",
  },
  explanation: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 20,
    marginBottom: 10,
  },
  problem: {
    fontSize: 13,
    color: "#FBBF24",
    fontWeight: "600",
    marginBottom: 8,
  },
  barWrap: {
    marginBottom: 4,
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barBgStrong: {
    backgroundColor: "rgba(34,197,94,0.2)",
  },
  barBgWeak: {
    backgroundColor: "rgba(251,191,36,0.2)",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  barFillStrong: {
    backgroundColor: "#22C55E",
  },
  barFillWeak: {
    backgroundColor: "#FBBF24",
  },
  action: {
    fontSize: 13,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 6,
  },
});
