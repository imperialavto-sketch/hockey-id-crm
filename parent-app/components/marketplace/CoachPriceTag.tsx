import React from "react";
import { colors } from "@/constants/theme";
import { Text, StyleSheet } from "react-native";

interface CoachPriceTagProps {
  price: number;
  label?: string;
}

export function CoachPriceTag({ price, label = "тренировка" }: CoachPriceTagProps) {
  return (
    <Text style={styles.price}>
      {price.toLocaleString("ru")} ₽ / {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  price: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
