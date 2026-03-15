import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isDev } from "@/config/api";
import { getCoachForUI } from "@/services/marketplaceService";
import { MOCK_COACHES } from "@/constants/mockCoaches";
import { MOCK_COACH_REVIEWS } from "@/constants/mockCoachReviews";
import { matchCoachesToPlayer, getDefaultPlayerContext } from "@/lib/coach-matching";
import { VerifiedCoachHero } from "@/components/marketplace/VerifiedCoachHero";
import { CoachTrustSection } from "@/components/marketplace/CoachTrustBadge";
import { CoachStatsRow } from "@/components/marketplace/CoachStatsRow";
import { CoachCredentialsCard } from "@/components/marketplace/CoachCredentialsCard";
import { CoachSpecializationTags } from "@/components/marketplace/CoachSpecializationTags";
import { CoachReviewsSection } from "@/components/marketplace/CoachReviewsSection";
import { SmartMatchCard } from "@/components/marketplace/SmartMatchCard";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography } from "@/constants/theme";
import { DEMO_PLAYER } from "@/constants/demoPlayer";

const PRESSED_OPACITY = 0.88;

function CoachDetailSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={340} style={styles.skeletonHero} />
      <SkeletonBlock height={120} style={styles.skeletonCard} />
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={80} style={styles.skeletonCard} />
      <SkeletonBlock height={56} style={styles.skeletonCta} />
    </View>
  );
}

export default function CoachDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [coach, setCoach] = useState<Awaited<ReturnType<typeof getCoachForUI>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadCoach = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const c = await getCoachForUI(id);
      setCoach(c ?? (isDev ? MOCK_COACHES.find((x) => x.id === id) ?? null : null));
    } catch {
      setCoach(isDev ? MOCK_COACHES.find((x) => x.id === id) ?? null : null);
      if (!isDev) setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCoach();
  }, [loadCoach]);

  const reviews = useMemo(
    () => (id ? MOCK_COACH_REVIEWS.filter((r) => r.coachId === id) : []),
    [id]
  );

  const matchResult = useMemo(() => {
    if (!coach) return null;
    const results = matchCoachesToPlayer([coach], getDefaultPlayerContext());
    return results[0] ?? null;
  }, [coach]);

  const header = (
    <View style={[styles.customHeader, { paddingTop: insets.top + spacing.lg }]}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => {
          triggerHaptic();
          router.back();
        }}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </Pressable>
      <Text style={styles.headerTitle}>Тренер</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.paddedContent}>
          <CoachDetailSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (error || !coach) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Тренер не найден</Text>
          <Text style={styles.errorSub}>
            Проверьте ссылку или вернитесь в каталог тренеров
          </Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: PRESSED_OPACITY }]}
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
          >
            <Text style={styles.retryBtnText}>Вернуться</Text>
          </Pressable>
        </View>
      </FlagshipScreen>
    );
  }

  const goToBooking = () => {
    triggerHaptic();
    if (id) router.push(`/marketplace/coach/${id}/booking`);
  };

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <VerifiedCoachHero coach={coach} onBook={goToBooking} />
      </Animated.View>
      <View style={styles.spacer} />

      <Animated.View entering={screenReveal(STAGGER)}>
        <CoachTrustSection coach={coach} />
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 2)}>
        <CoachStatsRow coach={coach} />
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 3)}>
        <CoachCredentialsCard coach={coach} />
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 4)}>
        <CoachSpecializationTags coach={coach} />
      </Animated.View>

      {matchResult && matchResult.matchScore >= 60 && (
        <Animated.View entering={screenReveal(STAGGER * 5)}>
          <SmartMatchCard match={matchResult} playerName={DEMO_PLAYER.name} />
        </Animated.View>
      )}

      <Animated.View entering={screenReveal(matchResult && matchResult.matchScore >= 60 ? STAGGER * 6 : STAGGER * 5)}>
        <CoachReviewsSection
          reviews={reviews}
          rating={coach.rating}
          reviewsCount={coach.reviewsCount}
        />
      </Animated.View>

      <Animated.View entering={screenReveal(matchResult && matchResult.matchScore >= 60 ? STAGGER * 7 : STAGGER * 6)}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: PRESSED_OPACITY }]}
          onPress={goToBooking}
        >
          <Text style={styles.ctaText}>Записаться на тренировку</Text>
          <Ionicons name="arrow-forward" size={22} color={colors.bgDeep} />
        </Pressable>
      </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", lineHeight: 22, color: colors.text },
  headerBtn: { width: 40, height: 40 },

  paddedContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  skeletonContent: { gap: spacing.xl },
  skeletonHero: { borderRadius: 20 },
  skeletonCard: { borderRadius: 20 },
  skeletonCta: { borderRadius: 14, marginTop: spacing.md },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  errorTitle: { ...typography.h2, color: colors.text, textAlign: "center" },
  errorSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 14,
  },
  retryBtnText: { fontSize: 16, fontWeight: "600", color: colors.onAccent },

  spacer: { height: spacing.xxl },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
    ...typography.body,
    fontWeight: "800",
  },
  ctaText: {
    color: colors.bgDeep,
  },
});
