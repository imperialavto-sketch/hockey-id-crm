import React from "react";
import { colors, typography, spacing } from "@/constants/theme";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CoachReview } from "@/types/review";

interface CoachReviewCardProps {
  review: CoachReview;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    "янв", "фев", "мар", "апр", "май", "июн",
    "июл", "авг", "сен", "окт", "нояб", "дек",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function CoachReviewCard({ review }: CoachReviewCardProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.parentName}>{review.parentName}</Text>
        <Text style={styles.meta}>
          {review.playerPosition
            ? `Игрок ${review.playerAge} лет, ${review.playerPosition}`
            : `Игрок ${review.playerAge} лет`}
        </Text>
      </View>
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={16} color={colors.warning} />
        <Text style={styles.rating}>{review.rating.toFixed(1)}</Text>
        <Text style={styles.date}>{formatDate(review.date)}</Text>
        {review.verifiedBooking && (
          <View style={styles.verified}>
            <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
            <Text style={styles.verifiedText}>Подтверждённое бронирование</Text>
          </View>
        )}
      </View>
      <Text style={styles.title}>{review.title}</Text>
      <Text style={styles.text}>{review.text}</Text>
      {review.tags.length > 0 && (
        <View style={styles.tags}>
          {review.tags.map((t, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  header: {
    marginBottom: spacing.sm,
  },
  parentName: {
    ...typography.cardTitle,
    color: colors.text,
  },
  meta: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  rating: {
    ...typography.bodySmall,
    fontWeight: "700",
    color: colors.text,
  },
  date: {
    ...typography.captionSmall,
    color: colors.textMuted,
  },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: "auto",
  },
  verifiedText: {
    ...typography.captionSmall,
    color: colors.accent,
    fontWeight: "600",
  },
  title: {
    ...typography.bodySmall,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  text: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tag: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
  },
  tagText: {
    ...typography.captionSmall,
    color: colors.accent,
    fontWeight: "600",
  },
});
