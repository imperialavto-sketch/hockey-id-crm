import React from "react";
import { colors, spacing } from "@/constants/theme";
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
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
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
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  spec: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: 2,
  },
  city: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  desc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    gap: 4,
    minHeight: 36,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
});
