import React, { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import {
  getPlayers,
  getLatestTrainingSummaryForPlayer,
  type ParentLiveTrainingHeroPayload,
} from "@/services/playerService";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { ParentLiveTrainingHeroBlock } from "@/components/live-training/ParentLiveTrainingHeroBlock";
import { PrimaryButton } from "@/components/ui";
import { SectionCard } from "@/components/player-passport";
import { PremiumStatGrid, SkeletonBlock, ErrorStateView, EmptyStateView } from "@/components/ui";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, shadows, radius, typography } from "@/constants/theme";
import type { Player } from "@/types";

function buildPlayerDisplay(p: Player) {
  return {
    number: p.number ? `#${p.number}` : "—",
    name: p.name,
    position: p.position || "—",
    team: p.team || "—",
    age: p.age != null ? String(p.age) : "—",
    photo: "https://via.placeholder.com/80",
  };
}

const QUICK_STATS_PLACEHOLDER = [
  { label: "Игры", value: "—" },
  { label: "Голы", value: "—" },
  { label: "Передачи", value: "—" },
  { label: "Очки", value: "—", accent: true },
];

const IMPROVEMENTS = [
  { skill: "Катание", change: "+12%" },
  { skill: "Бросок", change: "+8%" },
  { skill: "Сила", change: "+15%" },
];

const SKELETON_KEYS = [1, 2, 3, 4] as const;

const EMPTY_LIVE_TRAINING_HERO: ParentLiveTrainingHeroPayload = {
  summary: null,
  guidance: null,
  fallbackLine: null,
  provenanceLine: null,
};

const HomeSkeleton = memo(function HomeSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={200} style={styles.skeletonHero} />
      <View style={styles.skeletonStats}>
        {SKELETON_KEYS.map((i) => (
          <SkeletonBlock key={i} height={76} style={styles.skeletonStatBlock} />
        ))}
      </View>
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={56} style={styles.skeletonButton} />
    </View>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const mountedRef = useRef(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeError, setHomeError] = useState<"network" | null>(null);
  const [liveTrainingHero, setLiveTrainingHero] =
    useState<ParentLiveTrainingHeroPayload>(EMPTY_LIVE_TRAINING_HERO);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setPlayers([]);
      setLiveTrainingHero(EMPTY_LIVE_TRAINING_HERO);
      return;
    }
    setLoading(true);
    setHomeError(null);
    try {
      const list = await getPlayers(user.id);
      if (!mountedRef.current) return;
      setPlayers(list);
      const firstId = list[0]?.id;
      if (firstId) {
        const hero = await getLatestTrainingSummaryForPlayer(firstId);
        if (mountedRef.current) setLiveTrainingHero(hero);
      } else if (mountedRef.current) {
        setLiveTrainingHero(EMPTY_LIVE_TRAINING_HERO);
      }
    } catch {
      if (mountedRef.current) {
        setPlayers([]);
        setLiveTrainingHero(EMPTY_LIVE_TRAINING_HERO);
        setHomeError("network");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const goTo = useCallback(
    (path: string) => {
      triggerHaptic();
      router.push(path as never);
    },
    [router]
  );

  const openPassport = useCallback(() => {
    triggerHaptic();
    const playerId = players[0]?.id;
    if (!playerId) {
      router.push("/(tabs)/player" as never);
      return;
    }
    router.push(`/player/${playerId}/passport` as never);
  }, [router, players]);

  const handleAddPlayer = useCallback(() => {
    triggerHaptic();
    router.push("/player/add");
  }, [router]);

  const heroPlayer = useMemo(
    () => (players[0] ? buildPlayerDisplay(players[0]) : null),
    [players[0]]
  );

  if (loading) {
    return (
      <FlagshipScreen>
        <HomeSkeleton />
      </FlagshipScreen>
    );
  }

  if (homeError) {
    return (
      <FlagshipScreen scroll={false}>
        <ErrorStateView
          variant="network"
          title="Ошибка загрузки"
          subtitle="Проверьте соединение и попробуйте снова"
          onAction={loadData}
          style={styles.errorWrap}
        />
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen>
      {players.length === 0 ? (
        /* Empty state when no players */
        <Animated.View entering={screenReveal(0)}>
          <View style={styles.emptyContainer}>
            <EmptyStateView
              icon="people-outline"
              title="Нет игроков"
              subtitle="Добавьте игрока, чтобы видеть профиль и статистику"
              style={styles.emptyStateWrap}
            />
            <View style={styles.arenaTrainingBlockWrap}>
              <ParentLiveTrainingHeroBlock
                summary={EMPTY_LIVE_TRAINING_HERO.summary}
                guidance={EMPTY_LIVE_TRAINING_HERO.guidance}
                fallbackLine={EMPTY_LIVE_TRAINING_HERO.fallbackLine}
                provenanceLine={EMPTY_LIVE_TRAINING_HERO.provenanceLine}
              />
            </View>
            <PrimaryButton
              label="Добавить игрока"
              onPress={handleAddPlayer}
            />
          </View>
        </Animated.View>
      ) : (
        <>
          {/* Hero */}
          {heroPlayer && (
            <Animated.View entering={screenReveal(0)} style={styles.heroSection}>
              <View style={styles.hero}>
                <LinearGradient
                  colors={[colors.accentSoft, "transparent"]}
                  style={styles.heroGlow}
                />
                <View style={styles.heroContent}>
                  <Text style={styles.heroNumber}>{heroPlayer.number}</Text>
                  <Text style={styles.heroName}>{heroPlayer.name}</Text>
                  <Text style={styles.heroMeta}>
                    {heroPlayer.position} • {heroPlayer.team} • {heroPlayer.age} лет
                  </Text>
                </View>
                <View style={styles.photoWrap}>
                  <Image
                    source={{ uri: heroPlayer.photo || "https://via.placeholder.com/80" }}
                    style={styles.photo}
                  />
                </View>
              </View>
            </Animated.View>
          )}

          {/* Stats */}
          <Animated.View entering={screenReveal(STAGGER)}>
            <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Статистика</Text>
            <Text style={styles.sectionSub}>Быстрая статистика сезона</Text>
            <View style={styles.quickStatsWrap}>
              <PremiumStatGrid stats={QUICK_STATS_PLACEHOLDER} />
            </View>
          </Animated.View>

          {/* Team */}
          <Animated.View entering={screenReveal(STAGGER * 2)}>
            <ActionLinkCard
              icon="people-outline"
              title="Команда"
              description="Лента, чат, объявления"
              onPress={() => goTo("/team/feed")}
            />
          </Animated.View>

          {/* Arena: сводка по тренировке (всегда видимый блок) */}
          <Animated.View entering={screenReveal(STAGGER * 2.5)}>
            <View style={styles.arenaTrainingBlockWrap}>
              <ParentLiveTrainingHeroBlock
                summary={liveTrainingHero.summary}
                guidance={liveTrainingHero.guidance}
                fallbackLine={liveTrainingHero.fallbackLine}
                provenanceLine={liveTrainingHero.provenanceLine}
              />
            </View>
          </Animated.View>

          {/* Development */}
          <Animated.View entering={screenReveal(STAGGER * 3)}>
            <SectionCard title="Развитие игрока" style={styles.sectionCard}>
              {IMPROVEMENTS.map((item, i) => (
                <View
                  key={item.skill}
                  style={[styles.devRow, i < IMPROVEMENTS.length - 1 && styles.devRowBorder]}
                >
                  <Text style={styles.devSkill}>{item.skill}</Text>
                  <Text style={styles.devChange}>{item.change}</Text>
                </View>
              ))}
            </SectionCard>
          </Animated.View>

          {/* Passport CTA */}
          <Animated.View entering={screenReveal(STAGGER * 4)}>
            <ActionLinkCard
              icon="card-outline"
              title="Открыть паспорт игрока"
              description="Официальный цифровой паспорт хоккеиста"
              onPress={openPassport}
              variant="accent"
            />
          </Animated.View>
        </>
      )}
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  skeletonContent: { gap: spacing.xl },
  skeletonHero: {
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  skeletonStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  skeletonStatBlock: {
    flex: 1,
    minWidth: 72,
    borderRadius: radius.md,
  },
  skeletonCard: {
    borderRadius: radius.lg,
  },
  skeletonButton: {
    borderRadius: radius.sm,
  },
  errorWrap: { flex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyStateWrap: {
    marginBottom: spacing.lg,
  },
  arenaTrainingBlockWrap: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  heroSection: { marginBottom: spacing.xxl },
  hero: {
    position: "relative" as const,
    alignItems: "center",
    paddingVertical: spacing.xxl,
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLevel2,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    ...shadows.level2,
  },
  heroGlow: {
    position: "absolute" as const,
    top: -40,
    left: "50%",
    marginLeft: -100,
    width: 200,
    height: 120,
    borderRadius: 100,
    opacity: 0.4,
  },
  heroContent: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  heroNumber: {
    fontSize: 72,
    fontWeight: "900",
    letterSpacing: -2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  heroName: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  heroMeta: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  photoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.surfaceLevel1Border,
  },
  photo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginTop: spacing.xxl,
  },
  sectionTitleFirst: { marginTop: 0 },
  sectionSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  quickStatsWrap: { marginBottom: spacing.xl },
  sectionCard: {
    borderColor: colors.surfaceLevel1Border,
    ...shadows.level1,
    marginBottom: spacing.xl,
  },

  devRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  devRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  devSkill: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  devChange: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent,
  },
});
