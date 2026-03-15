import React from "react";
import { colors, spacing } from "@/constants/theme";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { triggerHaptic } from "@/lib/haptics";

interface PricingToggleProps {
  value: "monthly" | "yearly";
  onChange: (v: "monthly" | "yearly") => void;
  yearlyDiscount?: string;
}

export function PricingToggle({
  value,
  onChange,
  yearlyDiscount = "2 месяца в подарок",
}: PricingToggleProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <Pressable
          style={[styles.tab, value === "monthly" && styles.tabActive]}
          onPress={() => {
            triggerHaptic();
            onChange("monthly");
          }}
        >
          <Text style={[styles.tabText, value === "monthly" && styles.tabTextActive]}>
            Месяц
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, value === "yearly" && styles.tabActive]}
          onPress={() => {
            triggerHaptic();
            onChange("yearly");
          }}
        >
          <Text style={[styles.tabText, value === "yearly" && styles.tabTextActive]}>
            Год
          </Text>
        </Pressable>
      </View>
      {value === "yearly" && yearlyDiscount && (
        <Text style={styles.savings}>{yearlyDiscount}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xxl,
  },
  track: {
    flexDirection: "row",
    backgroundColor: colors.surfaceLevel1Border,
    borderRadius: 14,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: colors.accentSoft,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.accent,
  },
  savings: {
    fontSize: 13,
    color: colors.success,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
