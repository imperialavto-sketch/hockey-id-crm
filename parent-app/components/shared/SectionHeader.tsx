import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  compact?: boolean;
}

export function SectionHeader({
  title,
  subtitle,
  compact = false,
}: SectionHeaderProps) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  wrapCompact: {
    marginBottom: 10,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  titleCompact: {
    fontSize: 17,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
    letterSpacing: 0.1,
  },
  subtitleCompact: {
    marginTop: 2,
    fontSize: 12,
  },
});
