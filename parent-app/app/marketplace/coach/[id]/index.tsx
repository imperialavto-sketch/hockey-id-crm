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
import { useAuth } from "@/context/AuthContext";
import { getPlayers } from "@/services/playerService";
import { isDev } from "@/config/api";
import { getCoachForUI } from "@/services/marketplaceService";
import { COACH_MARK_ID } from "@/services/chatService";
import { MOCK_COACHES } from "@/constants/mockCoaches";
import { MOCK_COACH_REVIEWS } from "@/constants/mockCoachReviews";
import { matchCoachesToPlayer, getNeutralPlayerContext, buildPlayerContext } from "@/lib/coach-matching";
import { VerifiedCoachHero } from "@/components/marketplace/VerifiedCoachHero";
import { CoachTrustSection } from "@/components/marketplace/CoachTrustBadge";
import { CoachStatsRow } from "@/components/marketplace/CoachStatsRow";
import { CoachCredentialsCard } from "@/components/marketplace/CoachCredentialsCard";
import { CoachSpecializationTags } from "@/components/marketplace/CoachSpecializationTags";
import { CoachReviewsSection } from "@/components/marketplace/CoachReviewsSection";
import { SmartMatchCard } from "@/components/marketplace/SmartMatchCard";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock, GhostButton, PrimaryButton } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { colors, spacing, typography, radius } from "@/constants/theme";

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
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [coach, setCoach] = useState<Awaited<ReturnType<typeof getCoachForUI>>>(null);
  const [players, setPlayers] = useState<{ name: string; age: number; position?: string }[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (user?.id) {
      getPlayers(user.id)
        .then((list) => {
          setPlayers(list);
          setPlayerId(list[0]?.id ?? null);
        })
        .catch(() => {
          setPlayers([]);
          setPlayerId(null);
        });
    } else {
      setPlayers([]);
      setPlayerId(null);
    }
  }, [user?.id]);

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
    const ctx = players[0]
      ? buildPlayerContext({ age: players[0].age, position: players[0].position })
      : getNeutralPlayerContext();
    const results = matchCoachesToPlayer([coach], ctx);
    return results[0] ?? null;
  }, [coach, players]);

  const header = (
    <ScreenHeader
      title="Тренер"
      onBack={() => {
        triggerHaptic();
        router.back();
      }}
    />
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
          <GhostButton
            label="Вернуться"
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
          />
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
          <SmartMatchCard match={matchResult} playerName={players[0]?.name ?? null} />
        </Animated.View>
      )}

      <Animated.View entering={screenReveal(matchResult && matchResult.matchScore >= 60 ? STAGGER * 6 : STAGGER * 5)}>
        <CoachReviewsSection
          reviews={reviews}
          rating={coach.rating}
          reviewsCount={coach.reviewsCount}
        />
      </Animated.View>

      <Animated.View entering={screenReveal(matchResult && matchResult.matchScore >= 60 ? STAGGER * 6.5 : STAGGER * 5.5)}>
        <GhostButton
          label="Узнать у Coach Mark, подойдёт ли тренер моему ребёнку"
          leftIcon={<Ionicons name="sparkles-outline" size={18} color={colors.accent} />}
          onPress={() => {
            triggerHaptic();
            const params = new URLSearchParams();
            if (playerId) params.set("playerId", playerId);
            params.set(
              "initialMessage",
              `Подходит ли тренер ${coach.fullName} для моего ребёнка?`
            );
            router.push(`/chat/${COACH_MARK_ID}?${params.toString()}`);
          }}
        />
      </Animated.View>

      <Animated.View entering={screenReveal(matchResult && matchResult.matchScore >= 60 ? STAGGER * 7 : STAGGER * 6)} style={styles.ctaWrap}>
        <PrimaryButton
          label="Записаться на тренировку"
          onPress={goToBooking}
        />
      </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  paddedContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  skeletonContent: { gap: spacing.xl },
  skeletonHero: { borderRadius: 20 },
  skeletonCard: { borderRadius: radius.lg },
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
  spacer: { height: spacing.xxl },
  ctaWrap: {
    marginTop: spacing.xl,
  },
});
