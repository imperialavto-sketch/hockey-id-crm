import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Star } from "lucide-react-native";

interface CoachRatingProps {
  rating: number;
  reviewsCount: number;
}

export function CoachRating({ rating, reviewsCount }: CoachRatingProps) {
  return (
    <View style={styles.wrap}>
      <Star size={16} color="#F59E0B" fill="#F59E0B" />
      <Text style={styles.rating}>{rating.toFixed(1)}</Text>
      <Text style={styles.reviews}>({reviewsCount} отзывов)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rating: {
    fontSize: 15,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  reviews: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
});
