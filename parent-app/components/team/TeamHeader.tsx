import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/theme";

interface TeamHeaderProps {
  teamName: string;
  subtitle?: string;
}

export function TeamHeader({ teamName, subtitle = "Командная лента" }: TeamHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.teamName}>{teamName}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  teamName: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
