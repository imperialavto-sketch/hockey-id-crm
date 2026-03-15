import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { skillBar, gradients } from "@/theme/designSystem";

interface PlayerAttributesGlassProps {
  skating: number;
  shooting: number;
  passing: number;
  hockeyIQ: number;
  defense?: number;
  strength?: number;
}

const ATTR_LABELS: Record<string, string> = {
  skating: "Skating",
  shooting: "Shooting",
  passing: "Passing",
  hockeyIQ: "Hockey IQ",
  defense: "Defense",
  strength: "Strength",
};

export function PlayerAttributesGlass({
  skating,
  shooting,
  passing,
  hockeyIQ,
  defense = 65,
  strength = 60,
}: PlayerAttributesGlassProps) {
  const attrs = [
    { key: "skating", value: skating },
    { key: "shooting", value: shooting },
    { key: "passing", value: passing },
    { key: "hockeyIQ", value: hockeyIQ },
    { key: "defense", value: defense },
    { key: "strength", value: strength },
  ];

  const content = (
    <View style={styles.inner}>
      <Text style={styles.title}>Атрибуты</Text>
      <View style={styles.grid}>
        {attrs.map((attr) => (
          <View key={attr.key} style={styles.row}>
            <Text style={styles.label}>{ATTR_LABELS[attr.key] || attr.key}</Text>
            <View style={styles.valueWrap}>
              <View style={styles.bar}>
                <LinearGradient
                  colors={[...gradients.skillBar]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.barFill, { width: `${Math.min(attr.value, 99)}%` }]}
                />
              </View>
              <Text style={styles.value}>{attr.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, styles.webFallback]}>{content}</View>
    );
  }

  return (
    <BlurView intensity={20} tint="dark" style={styles.container}>
      {content}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  webFallback: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  inner: {
    padding: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 20,
  },
  grid: {
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    minWidth: 90,
    opacity: 0.95,
  },
  valueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bar: {
    flex: 1,
    height: skillBar.height,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: skillBar.borderRadius,
    overflow: "hidden",
    shadowColor: skillBar.shadowColor,
    shadowOpacity: skillBar.shadowOpacity,
    shadowRadius: skillBar.shadowRadius,
    elevation: 4,
  },
  barFill: {
    height: "100%",
    borderRadius: skillBar.borderRadius,
  },
  value: {
    color: "#60A5FA",
    fontSize: 15,
    fontWeight: "900",
    minWidth: 28,
    textAlign: "right",
  },
});
