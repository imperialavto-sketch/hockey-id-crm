import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, FlatList, StyleSheet, Text, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { COACH_FILTERS } from "@/constants/mockCoaches";
import { getCoaches } from "@/services/marketplaceService";
import { matchCoachesToPlayer, getNeutralPlayerContext } from "@/lib/coach-matching";
import { CoachHero } from "@/components/marketplace/CoachHero";
import { CoachFilters } from "@/components/marketplace/CoachFilters";
import { CoachCard } from "@/components/marketplace/CoachCard";
import { RecommendedCoachCard } from "@/components/marketplace/RecommendedCoachCard";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOP_RECOMMENDED = 3;
const PRESSED_OPACITY = 0.88;

function CoachesSkeleton() {
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

export default function CoachesMarketplaceScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    specialization,
    weakSkills: weakSkillsParam,
    playerAge: playerAgeParam,
    playerName: playerNameParam,
  } = useLocalSearchParams<{
    specialization?: string;
    weakSkills?: string;
    playerAge?: string;
    playerName?: string;
  }>();
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

  useEffect(() => {
    loadCoaches();
  }, [loadCoaches]);

  useEffect(() => {
    if (specialization && typeof specialization === "string") {
      const valid = COACH_FILTERS.some((f) => f.key === specialization);
      if (valid) setActiveFilter(specialization);
    }
  }, [specialization]);

  const playerContext = useMemo(() => {
    if (weakSkillsParam && playerAgeParam) {
      const age = parseInt(playerAgeParam, 10);
      if (Number.isNaN(age)) return getNeutralPlayerContext();
      return {
        weakSkills: weakSkillsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        age,
        position: undefined as string | undefined,
        targetGoal: undefined as string | undefined,
      };
    }
    return getNeutralPlayerContext();
  }, [weakSkillsParam, playerAgeParam]);

  const displayName = playerNameParam ?? "игрока";

  const allMatches = useMemo(
    () => matchCoachesToPlayer(coaches, playerContext, { returnAll: true }),
    [coaches, playerContext]
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
      <Text style={styles.headerTitle}>Тренеры</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  const listBottomPadding = spacing.xxl + insets.bottom;

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.paddedContent}>
          <CoachesSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Не удалось загрузить тренеров</Text>
          <Text style={styles.errorSub}>
            Проверьте подключение и попробуйте снова
          </Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: PRESSED_OPACITY }]}
            onPress={() => {
              triggerHaptic();
              loadCoaches();
            }}
          >
            <Text style={styles.retryBtnText}>Повторить</Text>
          </Pressable>
        </View>
      </FlagshipScreen>
    );
  }

  const ListHeader = () => (
    <>
      <Animated.View entering={screenReveal(0)}>
        <CoachHero playerName={playerNameParam ?? undefined} />
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
              <Text style={styles.aiSectionTitle}>
                ⭐ AI рекомендует для {displayName}
              </Text>
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
          : "Попробуйте изменить фильтр выше"}
      </Text>
    </View>
  );

  return (
    <FlagshipScreen header={header} scroll={false}>
      <FlatList
        data={filteredCoaches}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ListHeader />}
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
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", lineHeight: 22, color: "#ffffff" },
  headerBtn: { width: 40, height: 40 },

  paddedContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  skeletonContent: { gap: spacing.xl, paddingTop: spacing.sm },
  skeletonHero: { borderRadius: radius.lg, marginBottom: spacing.sm },
  skeletonFilters: { borderRadius: 14, marginBottom: spacing.sm },
  skeletonCard: { borderRadius: 20 },

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

  aiSection: { marginBottom: spacing.xl },
  aiSectionGlass: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
