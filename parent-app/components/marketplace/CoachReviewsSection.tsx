import React, { useMemo, useState } from "react";
import { colors, spacing, typography, radius, feedback } from "@/constants/theme";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { triggerHaptic } from "@/lib/haptics";
import { SectionCard } from "@/components/player-passport";
import { CoachReviewCard } from "./CoachReviewCard";
import type { CoachReview } from "@/types/review";

const PRESSED_OPACITY = feedback.pressedOpacity;

const REVIEW_FILTERS = [
  { key: "", label: "Все" },
  { key: "Катание", label: "Катание" },
  { key: "Бросок", label: "Бросок" },
  { key: "Физика", label: "Физика" },
  { key: "Подход к детям", label: "Подход к детям" },
];

interface CoachReviewsSectionProps {
  reviews: CoachReview[];
  rating: number;
  reviewsCount: number;
  onShowAll?: () => void;
}

const INITIAL_VISIBLE = 3;

export function CoachReviewsSection({
  reviews,
  rating,
  reviewsCount,
}: CoachReviewsSectionProps) {
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (!filter) return reviews;
    return reviews.filter(
      (r) =>
        r.tags.some((t) => t.toLowerCase().includes(filter.toLowerCase())) ||
        r.improvementArea?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [reviews, filter]);

  const verifiedCount = reviews.filter((r) => r.verifiedBooking).length;
  const displayed = expanded ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hasMore = filtered.length > INITIAL_VISIBLE && !expanded;

  const handleFilterPress = (key: string) => {
    triggerHaptic();
    setFilter(key);
  };

  const handleExpand = () => {
    triggerHaptic();
    setExpanded(true);
  };

  return (
    <View style={styles.wrap}>
      <SectionCard title="Отзывы родителей" style={styles.section}>
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Ionicons name="star" size={22} color={colors.warning} />
            <Text style={styles.rating}>{rating.toFixed(1)}</Text>
            <Text style={styles.reviewsCount}>{reviewsCount} отзывов</Text>
          </View>
          <Text style={styles.verified}>
            {verifiedCount} подтверждённых бронирований
          </Text>
        </View>

        <View style={styles.filters}>
          {REVIEW_FILTERS.map((f) => (
            <Pressable
              key={f.key || "all"}
              style={({ pressed }) => [
                styles.filterTag,
                filter === f.key && styles.filterTagActive,
                pressed && { opacity: PRESSED_OPACITY },
              ]}
              onPress={() => handleFilterPress(f.key)}
            >
              <Text
                style={[
                  styles.filterTagText,
                  filter === f.key && styles.filterTagTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {displayed.map((r) => (
          <CoachReviewCard key={r.id} review={r} />
        ))}

        {filtered.length === 0 && (
          <Text style={styles.empty}>Нет отзывов по выбранному фильтру</Text>
        )}

        {hasMore && (
          <Pressable
            style={({ pressed }) => [styles.showAll, pressed && { opacity: PRESSED_OPACITY }]}
            onPress={handleExpand}
          >
            <Text style={styles.showAllText}>Показать все отзывы</Text>
            <Ionicons name="chevron-down" size={20} color={colors.accent} />
          </Pressable>
        )}
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sectionGap,
  },
  section: {
    marginBottom: 0,
  },
  summary: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.sm,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rating: {
    ...typography.cardTitle,
    fontSize: 20,
    color: colors.text,
  },
  reviewsCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  verified: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  filterTag: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.sm,
  },
  filterTagActive: {
    backgroundColor: colors.accentSoft,
  },
  filterTagText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  filterTagTextActive: {
    color: colors.accent,
  },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  showAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },
  showAllText: {
    ...typography.bodySmall,
    fontWeight: "700",
    color: colors.accent,
  },
});
