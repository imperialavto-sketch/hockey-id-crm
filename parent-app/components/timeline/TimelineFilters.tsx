import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface Filter {
  id: string;
  label: string;
}

interface TimelineFiltersProps {
  filters: Filter[];
  active: string;
  onSelect: (id: string) => void;
}

export function TimelineFilters({
  filters,
  active,
  onSelect,
}: TimelineFiltersProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.wrap}
      style={styles.scroll}
    >
      {filters.map((f) => {
        const isActive = active === f.id;
        return (
          <Pressable
            key={f.id}
            onPress={() => onSelect(f.id)}
            style={({ pressed }) => [
              styles.chip,
              isActive && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
          >
            {isActive ? (
              <LinearGradient
                colors={[
                  "rgba(37,99,235,0.4)",
                  "rgba(124,58,237,0.3)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chipGradient}
              >
                <Text style={styles.chipTextActive}>{f.label}</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.chipText}>{f.label}</Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  wrap: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  chipActive: {
    borderColor: "rgba(37,99,235,0.45)",
  },
  chipGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.05,
  },
  chipTextActive: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.15,
  },
});
