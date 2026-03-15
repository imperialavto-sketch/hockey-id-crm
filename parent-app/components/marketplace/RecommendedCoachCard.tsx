import React from "react";
import { colors, spacing } from "@/constants/theme";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { MatchResult } from "@/lib/coach-matching";

interface RecommendedCoachCardProps {
  match: MatchResult;
  onPress: () => void;
  highlighted?: boolean;
}

export function RecommendedCoachCard({ match, onPress, highlighted }: RecommendedCoachCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const { coach } = match;
  const bio = (coach as { bio?: string }).bio ?? "";
  const shortBio = bio.length > 80 ? bio.slice(0, 80) + "…" : bio;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Смотреть профиль тренера ${coach.fullName}`}
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.card, highlighted && styles.cardHighlighted, animatedStyle]}>
        <View style={styles.top}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: coach.photoUrl }}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>
          <View style={styles.content}>
            <View style={styles.aiMatch}>
              <Ionicons name="sparkles" size={14} color={colors.accent} />
              <Text style={styles.aiMatchText}>
                {match.matchScore}% AI Match
              </Text>
            </View>
            <Text style={styles.name}>{coach.fullName}</Text>
            <Text style={styles.spec}>{coach.specialization}</Text>
            {shortBio ? (
              <Text style={styles.bio} numberOfLines={2}>{shortBio}</Text>
            ) : (
              match.matchReasons.length > 0 && (
                <Text style={styles.reasons} numberOfLines={2}>
                  {match.matchReasons.join(" • ")}
                </Text>
              )
            )}
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
  cardHighlighted: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(46,167,255,0.2)",
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
    marginBottom: 6,
  },
  bio: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  reasons: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
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
