import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/constants/theme";

interface CoachRatingProps {
  rating: number;
  reviewsCount: number;
}

export function CoachRating({ rating, reviewsCount }: CoachRatingProps) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="star" size={16} color={colors.warning} />
      <Text style={styles.rating}>{rating.toFixed(1)}</Text>
      <Text style={styles.reviews}>({reviewsCount} отзывов)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rating: {
    ...typography.bodySmall,
    fontWeight: "700",
    color: colors.text,
  },
  reviews: {
    ...typography.captionSmall,
    color: colors.textMuted,
  },
});
