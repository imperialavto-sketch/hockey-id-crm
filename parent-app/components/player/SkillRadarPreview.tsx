import React from "react";
import { colors } from "@/constants/theme";
import { View, Text, StyleSheet } from "react-native";

export interface SkillItem {
  label: string;
  score: number;
  maxScore: number;
}

export interface SkillRadarPreviewProps {
  skills: SkillItem[];
}

export function SkillRadarPreview({ skills }: SkillRadarPreviewProps) {
  return (
    <View style={styles.wrap}>
      {skills.map((s) => {
        const pct = Math.min(100, Math.round((s.score / s.maxScore) * 100));
        const isLow = pct < 70;
        return (
          <View key={s.label} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {s.label}
            </Text>
            <View style={styles.barWrap}>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    isLow ? styles.barFillLow : styles.barFillNorm,
                    { width: `${pct}%` },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.score, isLow && styles.scoreLow]}>
              {s.score}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: "#94A3B8",
    width: 100,
  },
  barWrap: {
    flex: 1,
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  barFillNorm: {
    backgroundColor: colors.accent,
  },
  barFillLow: {
    backgroundColor: "#FBBF24",
  },
  score: {
    fontSize: 14,
    fontWeight: "800",
    color: "#F8FAFC",
    width: 28,
    textAlign: "right",
  },
  scoreLow: {
    color: "#FBBF24",
  },
});
