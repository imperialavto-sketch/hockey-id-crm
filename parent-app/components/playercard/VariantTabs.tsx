import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import type { CardVariant } from "@/constants/mockPlayer";

interface VariantTabsProps {
  active: CardVariant;
  onSelect: (v: CardVariant) => void;
  variants: { id: CardVariant; label: string }[];
}

export function VariantTabs({ active, onSelect, variants }: VariantTabsProps) {
  const content = (
    <View style={styles.tabs}>
      {variants.map((v) => {
        const isActive = active === v.id;
        return (
          <Pressable
            key={v.id}
            onPress={() => onSelect(v.id)}
            style={({ pressed }) => [
              styles.tab,
              pressed && styles.tabPressed,
            ]}
          >
            {isActive ? (
              <LinearGradient
                colors={[
                  "rgba(37,99,235,0.5)",
                  "rgba(124,58,237,0.4)",
                  "rgba(239,68,68,0.3)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeBg}
              >
                <Text style={styles.tabLabelActive}>{v.label}</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.tabLabel}>{v.label}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View style={[styles.wrap, styles.wrapWeb]}>{content}</View>
    );
  }
  return (
    <View style={styles.wrap}>
      <BlurView intensity={32} tint="dark" style={styles.blur}>
        {content}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  wrapWeb: {
    backgroundColor: "rgba(8,16,28,0.92)",
  },
  blur: {
    borderRadius: 20,
    overflow: "hidden",
  },
  tabs: {
    flexDirection: "row",
    padding: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPressed: {
    opacity: 0.9,
  },
  activeBg: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 6,
    bottom: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
