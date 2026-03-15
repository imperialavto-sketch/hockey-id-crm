import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getPlayers } from "@/services/playerService";
import { PLAYER_CARD } from "@/constants/mockPlayer";
import { DEMO_PLAYER } from "@/constants/demoPlayer";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { SectionCard } from "@/components/player-passport";
import { PremiumStatGrid, SkeletonBlock, ErrorStateView } from "@/components/ui";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, shadows, radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

const PRESSED_OPACITY = 0.88;

const PLAYER = {
  number: DEMO_PLAYER.number,
  name: DEMO_PLAYER.name,
  position: DEMO_PLAYER.positionRu,
  team: DEMO_PLAYER.team,
  age: DEMO_PLAYER.age,
  photo: DEMO_PLAYER.image,
};

const QUICK_STATS = [
  { label: "Игры", value: String(DEMO_PLAYER.stats.games) },
  { label: "Голы", value: String(DEMO_PLAYER.stats.goals) },
  { label: "Передачи", value: String(DEMO_PLAYER.stats.assists) },
  { label: "Очки", value: String(DEMO_PLAYER.stats.points), accent: true },
];

const IMPROVEMENTS = [
  { skill: "Катание", change: "+12%" },
  { skill: "Бросок", change: "+8%" },
  { skill: "Сила", change: "+15%" },
];

function HomeSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={200} style={styles.skeletonHero} />
      <View style={styles.skeletonStats}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} height={76} style={styles.skeletonStatBlock} />
        ))}
      </View>
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={56} style={styles.skeletonButton} />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const mountedRef = useRef(true);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [homeError, setHomeError] = useState<"network" | null>(null);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setPlayerId(PLAYER_CARD.id);
      return;
    }
    setLoading(true);
    setHomeError(null);
    try {
      const list = await getPlayers(user.id);
      if (mountedRef.current) setPlayerId(list[0]?.id ?? PLAYER_CARD.id);
    } catch {
      if (mountedRef.current) {
        setPlayerId(PLAYER_CARD.id);
        setHomeError("network");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const goTo = (path: string) => {
    triggerHaptic();
    router.push(path as never);
  };

  const openPassport = () => {
    triggerHaptic();
    const id = playerId ?? PLAYER_CARD.id;
    router.push(`/player/${id}/passport` as never);
  };

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
      {/* Hero */}
      <Animated.View entering={screenReveal(0)} style={styles.heroSection}>
            <View style={styles.hero}>
              <LinearGradient
                colors={[colors.accentSoft, "transparent"]}
                style={styles.heroGlow}
              />
              <View style={styles.heroContent}>
                <Text style={styles.heroNumber}>{PLAYER.number}</Text>
                <Text style={styles.heroName}>{PLAYER.name}</Text>
                <Text style={styles.heroMeta}>
                  {PLAYER.position} • {PLAYER.team} • {PLAYER.age} лет
                </Text>
              </View>
              <View style={styles.photoWrap}>
                <Image source={{ uri: PLAYER.photo }} style={styles.photo} />
              </View>
            </View>
          </Animated.View>

          {/* Stats */}
          <Animated.View entering={screenReveal(STAGGER)}>
            <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Статистика</Text>
            <Text style={styles.sectionSub}>Быстрая статистика сезона</Text>
            <View style={styles.quickStatsWrap}>
              <PremiumStatGrid stats={QUICK_STATS} />
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
    borderRadius: 18,
  },
  skeletonCard: {
    borderRadius: 20,
    marginTop: spacing.sm,
  },
  skeletonButton: {
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  errorWrap: { flex: 1 },
  heroSection: { marginBottom: spacing.xl },
  hero: {
    position: "relative" as const,
    alignItems: "center",
    paddingVertical: spacing.xxl,
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLevel2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
    borderColor: "rgba(255,255,255,0.12)",
  },
  photo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.35,
    marginTop: spacing.xxl,
  },
  sectionTitleFirst: { marginTop: 0 },
  sectionSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  quickStatsWrap: { marginBottom: spacing.xl },
  sectionCard: {
    borderColor: "rgba(255,255,255,0.08)",
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
