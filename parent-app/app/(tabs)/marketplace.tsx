import React, { useState, useMemo, useCallback } from "react";
import { View, FlatList, StyleSheet, Text, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { COACH_FILTERS } from "@/constants/mockCoaches";
import { getCoaches } from "@/services/marketplaceService";
import { matchCoachesToPlayer, getDefaultPlayerContext } from "@/lib/coach-matching";
import { CoachHero } from "@/components/marketplace/CoachHero";
import { CoachFilters } from "@/components/marketplace/CoachFilters";
import { CoachCard } from "@/components/marketplace/CoachCard";
import { RecommendedCoachCard } from "@/components/marketplace/RecommendedCoachCard";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock, ErrorStateView } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOP_RECOMMENDED = 3;
const PRESSED_OPACITY = 0.88;

function MarketplaceSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={160} style={styles.skeletonHero} />
      <SkeletonBlock height={48} style={styles.skeletonFilters} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
    </View>
  );
}

export default function MarketplaceTabScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState("");
  const [coaches, setCoaches] = useState<Awaited<ReturnType<typeof getCoaches>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadCoaches = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getCoaches(undefined, user?.id);
      setCoaches(data);
    } catch {
      setCoaches([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadCoaches();
    }, [loadCoaches])
  );

  const allMatches = useMemo(
    () =>
      matchCoachesToPlayer(coaches, getDefaultPlayerContext(), {
        returnAll: true,
      }),
    [coaches]
  );

  const recommended = useMemo(
    () => allMatches.filter((m) => m.matchScore >= 60).slice(0, TOP_RECOMMENDED),
    [allMatches]
  );

  const matchByCoachId = useMemo(
    () => new Map(allMatches.map((m) => [m.coach.id, m])),
    [allMatches]
  );

  const recommendedIds = useMemo(
    () => new Set(recommended.map((m) => m.coach.id)),
    [recommended]
  );

  const filteredCoaches = useMemo(() => {
    let list = coaches;
    if (activeFilter) {
      list = list.filter(
        (c) =>
          c.specialization === activeFilter ||
          (c.specializations ?? []).includes(activeFilter)
      );
    }
    const sorted = [...list].sort((a, b) => {
      const ma = matchByCoachId.get(a.id)?.matchScore ?? 0;
      const mb = matchByCoachId.get(b.id)?.matchScore ?? 0;
      return mb - ma;
    });
    return sorted.filter((c) => !recommendedIds.has(c.id));
  }, [coaches, activeFilter, matchByCoachId, recommendedIds]);

  const handleFilterSelect = (key: string) => {
    triggerHaptic();
    setActiveFilter(key);
  };

  const goToCoach = (id: string) => {
    triggerHaptic();
    router.push(`/marketplace/coach/${id}`);
  };

  const listBottomPadding = spacing.xxl + insets.bottom;

  if (loading) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.paddedContent}>
          <MarketplaceSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen scroll={false}>
        <ErrorStateView
          variant="network"
          title="Не удалось загрузить тренеров"
          subtitle="Проверьте подключение и попробуйте снова"
          onAction={loadCoaches}
          style={styles.errorContainer}
        />
      </FlagshipScreen>
    );
  }

  const ListHeader = () => (
    <>
      <Animated.View entering={screenReveal(0)}>
        <CoachHero />
      </Animated.View>
      <Animated.View entering={screenReveal(STAGGER)}>
        <CoachFilters
          filters={COACH_FILTERS}
          activeKey={activeFilter}
          onSelect={handleFilterSelect}
        />
      </Animated.View>
      {recommended.length > 0 && (
        <Animated.View entering={screenReveal(STAGGER * 2)}>
          <View style={styles.aiSection}>
            <View style={styles.aiSectionGlass}>
              <Text style={styles.aiSectionTitle}>⭐ AI рекомендует для Марка</Text>
              <Text style={styles.aiSectionSub}>
                Подобрано по AI-анализу развития игрока
              </Text>
            </View>
            {recommended.map((m, i) => (
              <RecommendedCoachCard
                key={m.coach.id}
                match={m}
                highlighted={i === 0}
                onPress={() => goToCoach(m.coach.id)}
              />
            ))}
          </View>
        </Animated.View>
      )}
      <Animated.View entering={screenReveal(STAGGER * 3)} style={styles.allSection}>
        <Text style={styles.allTitle}>Все тренеры</Text>
      </Animated.View>
    </>
  );

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <Ionicons name="people-outline" size={48} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>
        {coaches.length === 0 ? "Нет тренеров" : "Нет тренеров по фильтру"}
      </Text>
      <Text style={styles.emptySub}>
        {coaches.length === 0
          ? "Тренеры появятся в разделе позже"
          : "Попробуйте изменить фильтр"}
      </Text>
    </View>
  );

  return (
    <FlagshipScreen scroll={false}>
      <FlatList
        data={filteredCoaches}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={filteredCoaches.length === 0 ? <ListEmpty /> : null}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: listBottomPadding,
            flexGrow:
              filteredCoaches.length === 0 && recommended.length === 0 ? 1 : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const match = matchByCoachId.get(item.id);
          return (
            <Animated.View entering={screenReveal(STAGGER * 4 + index * 40)}>
              <CoachCard
                coach={item}
                matchInfo={
                  match
                    ? {
                        matchScore: match.matchScore,
                        matchReasons: match.matchReasons,
                      }
                    : undefined
                }
                onPress={() => goToCoach(item.id)}
              />
            </Animated.View>
          );
        }}
      />
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  paddedContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  skeletonContent: { gap: spacing.xl, paddingTop: spacing.sm },
  skeletonHero: { borderRadius: radius.lg, marginBottom: spacing.sm },
  skeletonFilters: { borderRadius: 14, marginBottom: spacing.sm },
  skeletonCard: { borderRadius: 20 },

  errorContainer: { flex: 1 },
  aiSection: {
    marginBottom: spacing.xl,
  },
  aiSectionGlass: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  aiSectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  aiSectionSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  allSection: { marginBottom: spacing.lg },
  allTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    marginHorizontal: spacing.screenPadding,
  },
  list: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
