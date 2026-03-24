import React from "react";
import { colors, shadows, radius } from "@/constants/theme";
import { View, Text, StyleSheet } from "react-native";

export interface InsightBlockProps {
  title: string;
  items: { label: string; value: string }[];
}

export function InsightBlock({ title, items }: InsightBlockProps) {
  return (
    <View style={styles.card}>
      <View style={styles.edgeGlow} />
      <Text style={styles.title}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={[styles.row, i === items.length - 1 && styles.rowLast]}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 20,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    overflow: "hidden",
    position: "relative",
    ...shadows.level1,
  },
  edgeGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 14,
    color: "#94A3B8",
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F8FAFC",
    marginLeft: 12,
    textAlign: "right",
  },
});
