import React from "react";
import { colors, spacing } from "@/constants/theme";
import { ScrollView, Pressable, Text, StyleSheet } from "react-native";

export interface FilterItem {
  key: string;
  label: string;
}

interface CoachFiltersProps {
  filters: FilterItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export function CoachFilters({ filters, activeKey, onSelect }: CoachFiltersProps) {
  const handlePress = (key: string) => {
    if (activeKey !== key) onSelect(key);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {filters.map((f) => (
        <Pressable
          key={f.key}
          style={[styles.chip, activeKey === f.key && styles.chipActive]}
          onPress={() => handlePress(f.key)}
        >
          <Text
            style={[
              styles.chipText,
              activeKey === f.key && styles.chipTextActive,
            ]}
          >
            {f.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 48,
    marginBottom: spacing.xl,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.sm,
    paddingRight: spacing.xxl,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  chipActive: {
    backgroundColor: "transparent",
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
});
