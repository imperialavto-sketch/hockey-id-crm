import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

interface PlayerStatsGlassProps {
  games: number;
  goals: number;
  assists: number;
  points: number;
}

export function PlayerStatsGlass({
  games,
  goals,
  assists,
  points,
}: PlayerStatsGlassProps) {
  const cells = [
    { label: "ИГРЫ", value: games },
    { label: "ГОЛЫ", value: goals },
    { label: "ПЕРЕДАЧИ", value: assists },
    { label: "ОЧКИ", value: points, accent: true },
  ];

  const content = (
    <View style={styles.inner}>
      <LinearGradient
        colors={["rgba(255,255,255,0.08)", "transparent"]}
        style={styles.reflection}
      />
      <View style={styles.statsRow}>
        {cells.map((cell, i) => (
          <View key={i} style={[styles.cell, cell.accent && styles.cellAccent]}>
            <Text style={[styles.value, cell.accent && styles.valueAccent]}>
              {cell.value}
            </Text>
            <Text style={styles.label}>{cell.label}</Text>
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
    padding: 16,
  },
  reflection: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cell: {
    flex: 1,
    alignItems: "center",
  },
  cellAccent: {},
  value: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    textShadowColor: "rgba(59,130,246,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  valueAccent: {
    color: "#60A5FA",
    textShadowColor: "rgba(59,130,246,0.4)",
  },
  label: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
    letterSpacing: 0.5,
    opacity: 0.9,
  },
});
