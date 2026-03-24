import React from "react";
import { colors, spacing, typography, radius, shadows } from "@/constants/theme";
import { View, Text, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { triggerHaptic } from "@/lib/haptics";
import { PrimaryButton } from "@/components/ui";
import type { MockCoach } from "@/constants/mockCoaches";

interface VerifiedCoachHeroProps {
  coach: MockCoach;
  onBook: () => void;
}

export function VerifiedCoachHero({ coach, onBook }: VerifiedCoachHeroProps) {
  const handleBook = () => {
    triggerHaptic();
    onBook();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.photoWrap}>
        {coach.photoUrl ? (
          <Image
            source={{ uri: coach.photoUrl }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person" size={64} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.overlay} />
        {coach.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
            <Text style={styles.verifiedText}>Verified Coach</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">{coach.fullName}</Text>
        <Text style={styles.specialization} numberOfLines={2} ellipsizeMode="tail">
          {[coach.specialization, ...(coach.specializations ?? [])]
            .filter(Boolean)
            .join(" • ")}
        </Text>
        <Text style={styles.city} numberOfLines={1} ellipsizeMode="tail">{coach.city}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={20} color={colors.warning} />
          <Text style={styles.rating}>{coach.rating.toFixed(1)}</Text>
          <Text style={styles.reviews}>({coach.reviewsCount} отзывов)</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            от {coach.price.toLocaleString("ru")} ₽
          </Text>
          <Text style={styles.priceUnit}>/ тренировка</Text>
        </View>
        <View style={styles.ctaWrap}>
          <PrimaryButton
            label="Записаться"
            onPress={handleBook}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel2Border,
    ...shadows.level2,
  },
  photoWrap: {
    height: 260,
    position: "relative",
  },
  photo: {
    width: "100%",
    height: 260,
  },
  photoPlaceholder: {
    width: "100%",
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceLevel1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  verifiedBadge: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: radius.sm,
  },
  verifiedText: {
    ...typography.captionSmall,
    fontWeight: "600",
    color: "#ffffff",
  },
  info: {
    padding: spacing.xxl,
    paddingTop: spacing.xl,
  },
  name: {
    ...typography.heroName,
    color: colors.text,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  specialization: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  city: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  rating: {
    ...typography.cardTitle,
    fontSize: 18,
    color: colors.text,
  },
  reviews: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: spacing.md,
  },
  price: {
    ...typography.cardTitle,
    fontSize: 22,
    color: colors.accent,
  },
  priceUnit: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  ctaWrap: {
    marginTop: spacing.xl,
  },
});
