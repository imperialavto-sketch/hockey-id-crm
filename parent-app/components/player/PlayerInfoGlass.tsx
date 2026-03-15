import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";

interface PlayerInfoGlassProps {
  fullName: string;
  number: number;
  position: string;
  birthYear?: number;
  team: string;
}

export function PlayerInfoGlass({
  fullName,
  number,
  position,
  birthYear,
  team,
}: PlayerInfoGlassProps) {
  const content = (
    <View style={styles.inner}>
      <Text style={styles.name}>{fullName}</Text>
      <Text style={styles.meta}>
        №{number} · {position}
        {birthYear ? ` · ${birthYear}` : ""}
      </Text>
      <Text style={styles.team}>{team}</Text>
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
    padding: 24,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    textShadowColor: "rgba(255,255,255,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  meta: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
    opacity: 0.9,
  },
  team: {
    color: "#60A5FA",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
    letterSpacing: 0.3,
  },
});
