import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { glassCard, spacing } from "@/theme/designSystem";

interface GlassCardProps {
  children: React.ReactNode;
  style?: object;
  contentStyle?: object;
  intensity?: number;
  variant?: "default" | "subtle" | "strong";
  padding?: number;
}

export function GlassCard({
  children,
  style,
  contentStyle,
  intensity = 20,
  variant = "default",
  padding = spacing.screenPadding,
}: GlassCardProps) {
  const inner = (
    <View style={[styles.inner, { padding }, contentStyle]}>{children}</View>
  );

  const containerStyle = [
    styles.container,
    variant === "subtle" && styles.subtle,
    variant === "strong" && styles.strong,
    style,
  ];

  if (Platform.OS === "web") {
    return (
      <View style={[containerStyle, styles.webFallback]}>{inner}</View>
    );
  }
  return (
    <View style={containerStyle}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...glassCard,
  },
  webFallback: {
    backgroundColor: glassCard.backgroundColor,
  },
  subtle: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.06)",
  },
  strong: {
    backgroundColor: "rgba(255,255,255,0.08)" as const,
  },
  inner: {
    backgroundColor: "transparent",
  },
});
