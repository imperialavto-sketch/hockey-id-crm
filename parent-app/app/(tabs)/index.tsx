import React, { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { COACH_MARK_ID } from "@/services/chatService";
import { getPlayers } from "@/services/playerService";
import { getCoachMarkCheckins } from "@/services/coachMarkCheckins";
import {
  getCoachMarkNotes,
  getCoachMarkWeeklyPlans,
  getCoachMarkCalendarItems,
} from "@/services/coachMarkStorage";
import { getCoachMarkMessages } from "@/services/chatService";
import { computeCoachMarkNudges } from "@/services/coachMarkNudges";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
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
  const [coachMarkSummary, setCoachMarkSummary] = useState<{
    text: string;
    playerId?: string;
  } | null>(null);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setPlayers([]);
      return;
    }
    setLoading(true);
    setHomeError(null);
    try {
      const list = await getPlayers(user.id);
      if (mountedRef.current) setPlayers(list);
      const playerId = list[0]?.id ?? null;
      const checkins = await getCoachMarkCheckins(user.id, playerId);
      const lastCheckin = checkins[0];
      let summaryText: string;
      let summaryPlayerId: string | undefined = playerId ?? undefined;
      if (lastCheckin && (lastCheckin.summary || lastCheckin.nextStep)) {
        summaryText = (lastCheckin.summary || lastCheckin.nextStep).slice(0, 100);
        summaryPlayerId = lastCheckin.playerId ?? summaryPlayerId;
      } else {
        const [notes, plans, calendar, chat] = await Promise.all([
          getCoachMarkNotes(user.id, playerId),
          getCoachMarkWeeklyPlans(user.id, playerId),
          getCoachMarkCalendarItems(user.id, playerId),
          getCoachMarkMessages(user.id),
        ]);
        const hasRecentAI = chat.some(
          (m) => m.isAI || m.senderId === COACH_MARK_ID
        );
        const nudges = computeCoachMarkNudges({
          notesCount: notes.length,
          plansCount: plans.length,
          calendarItemsCount: calendar.length,
          playerId,
          hasRecentAIMessages: hasRecentAI,
        });
        const firstNudge = nudges[0];
        if (firstNudge) {
          summaryText = firstNudge.description;
          summaryPlayerId = firstNudge.playerId ?? summaryPlayerId;
        } else {
          summaryText = "Спросите Coach Mark — заходите раз в неделю за советом";
        }
      }
      if (mountedRef.current) {
        setCoachMarkSummary({ text: summaryText, playerId: summaryPlayerId });
      }
    } catch {
      if (mountedRef.current) {
        setPlayers([]);
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

  const handleCoachMarkEmpty = useCallback(() => {
    triggerHaptic();
    const q = coachMarkSummary?.playerId
      ? `?playerId=${encodeURIComponent(coachMarkSummary.playerId)}`
      : "";
    router.push(`/chat/${COACH_MARK_ID}${q}` as never);
  }, [router, coachMarkSummary?.playerId]);

  const handleCoachMarkFilled = useCallback(() => {
    triggerHaptic();
    const pid = coachMarkSummary?.playerId ?? players[0]?.id;
    const q = pid ? `?playerId=${encodeURIComponent(pid)}` : "";
    router.push(`/chat/${COACH_MARK_ID}${q}` as never);
  }, [router, coachMarkSummary?.playerId, players]);

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
            <View style={styles.emptyCoachMarkWrap}>
              <ActionLinkCard
                icon="sparkles"
                title="Coach Mark"
                description={
                  coachMarkSummary?.text ||
                  "Персональный AI-тренер: советы, планы и рекомендации"
                }
                onPress={handleCoachMarkEmpty}
                variant="accent"
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

          {/* Coach Mark */}
          <Animated.View entering={screenReveal(STAGGER * 2.5)}>
            <ActionLinkCard
              icon="sparkles"
              title="Coach Mark"
              description={
                coachMarkSummary?.text ||
                "Персональный AI-тренер: планы, подсказки и поддержка для семьи хоккеиста"
              }
              onPress={handleCoachMarkFilled}
              variant="accent"
            />
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
  emptyCoachMarkWrap: {
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
