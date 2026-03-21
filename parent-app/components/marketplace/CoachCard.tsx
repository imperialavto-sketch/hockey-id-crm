import React from "react";
import { colors, spacing, radius, typography } from "@/constants/theme";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { CoachRating } from "./CoachRating";
import { CoachPriceTag } from "./CoachPriceTag";

export interface CoachCardData {
  id: string;
  fullName: string;
  specialization: string;
  city: string;
  rating: number;
  reviewsCount: number;
  price: number;
  photoUrl: string;
  verified?: boolean;
  bio?: string;
}

export interface CoachCardMatchInfo {
  matchScore: number;
  matchReasons: string[];
}

interface CoachCardProps {
  coach: CoachCardData;
  onPress: () => void;
  matchInfo?: CoachCardMatchInfo;
}

export function CoachCard({ coach, onPress, matchInfo }: CoachCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bio = coach.bio ?? "";
  const shortBio = bio.length > 70 ? bio.slice(0, 70) + "…" : bio;
  const topReason = matchInfo?.matchReasons?.[0];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Смотреть профиль тренера ${coach.fullName}`}
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.top}>
          <View style={styles.avatarWrap}>
            {coach.photoUrl ? (
              <Image
                source={{ uri: coach.photoUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color={colors.textMuted} />
              </View>
            )}
          </View>
          <View style={styles.content}>
            {matchInfo && matchInfo.matchScore >= 60 && (
              <View style={styles.aiMatch}>
                <Ionicons name="sparkles" size={14} color={colors.accent} />
                <Text style={styles.aiMatchText}>
                  {matchInfo.matchScore}% AI Match
                </Text>
              </View>
            )}
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{coach.fullName}</Text>
            <Text style={styles.spec} numberOfLines={1} ellipsizeMode="tail">{coach.specialization}</Text>
            <Text style={styles.city} numberOfLines={1} ellipsizeMode="tail">{coach.city}</Text>
            {(shortBio || topReason) && (
              <Text style={styles.desc} numberOfLines={2}>
                {shortBio || topReason}
              </Text>
            )}
            <View style={styles.meta}>
              <CoachRating rating={coach.rating} reviewsCount={coach.reviewsCount} />
              <CoachPriceTag price={coach.price} />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>Смотреть профиль</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  pressed: { opacity: 0.88 },
  card: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceLevel2,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceLevel1,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  aiMatch: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  aiMatchText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 0.2,
  },
  name: {
    ...typography.cardTitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  spec: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  city: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  desc: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLevel1Border,
    gap: spacing.xs,
    minHeight: 40,
  },
  ctaText: {
    ...typography.bodySmall,
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
});
