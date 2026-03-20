import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Pressable,
  Platform,
  Animated,
  ScrollView,
  RefreshControl,
} from "react-native";
import AnimatedReanimated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getPlayers } from "@/services/playerService";
import { PLAYER_CARD } from "@/constants/mockPlayer";
import { DEMO_PLAYER } from "@/constants/demoPlayer";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { SectionCard } from "@/components/player-passport";
import { PremiumStatGrid, SkeletonBlock } from "@/components/ui";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, shadows, radius, typography } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { Player } from "@/types";

const PRESSED_OPACITY = 0.88;

/** Build display data for hero: use API player where available, fallback to DEMO */
function getHeroDisplay(selected: Player | null) {
  return {
    name: selected?.name ?? DEMO_PLAYER.name,
    number: selected?.number ? `#${selected.number}` : DEMO_PLAYER.number,
    position: selected?.position || DEMO_PLAYER.positionRu,
    team: selected?.team || DEMO_PLAYER.team,
    age: selected?.age ?? DEMO_PLAYER.age,
    city: DEMO_PLAYER.city,
    image: DEMO_PLAYER.image,
    coach: DEMO_PLAYER.coachAvatar,
  };
}

function SkillBar({
  title,
  value,
  delay,
}: {
  title: string;
  value: number;
  delay: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, {
        toValue: value / 100,
        duration: 900,
        useNativeDriver: false,
      }),
    ]).start();
  }, [delay, value, progress]);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.skillBarWrap}>
      <View style={styles.skillHead}>
        <Text style={styles.skillTitle}>{title}</Text>
        <Text style={styles.skillNum}>{value}</Text>
      </View>
      <View style={styles.skillTrack}>
        <Animated.View style={[styles.skillFill, { width: widthInterpolated }]}>
          <LinearGradient
            colors={[colors.accent, colors.accentSoft]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

function HubSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={220} style={styles.skeletonHero} />
      <View style={styles.skeletonStats}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} height={76} style={styles.skeletonStatBlock} />
        ))}
      </View>
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={120} style={styles.skeletonCard} />
    </View>
  );
}

function PlayerCard({
  player,
  isSelected,
  onPress,
}: {
  player: Player;
  isSelected: boolean;
  onPress: () => void;
}) {
  const initials = player.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.playerCard,
        isSelected && styles.playerCardSelected,
        pressed && { opacity: PRESSED_OPACITY },
      ]}
      onPress={onPress}
    >
      <View style={[styles.playerCardAvatar, isSelected && styles.playerCardAvatarSelected]}>
        <Text style={styles.playerCardInitials}>{initials || "?"}</Text>
      </View>
      <View style={styles.playerCardContent}>
        <Text style={styles.playerCardName} numberOfLines={1}>
          {player.name}
        </Text>
        <Text style={styles.playerCardMeta}>
          #{player.number} · {player.team || "—"}
        </Text>
      </View>
      {isSelected && (
        <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
      )}
    </Pressable>
  );
}

export default function PlayerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hubError, setHubError] = useState<"network" | null>(null);

  const loadPlayers = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setPlayers([]);
      setSelectedPlayerId(null);
      return;
    }
    setHubError(null);
    try {
      const list = await getPlayers(user.id);
      setPlayers(list);
      setSelectedPlayerId((prev) => {
        const stillExists = list.some((p) => p.id === prev);
        return stillExists ? prev : list[0]?.id ?? null;
      });
    } catch {
      setPlayers([]);
      setSelectedPlayerId(null);
      setHubError("network");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadPlayers();
      } else {
        setLoading(false);
        setPlayers([]);
        setSelectedPlayerId(null);
      }
    }, [loadPlayers, user?.id])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPlayers();
  }, [loadPlayers]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? null;
  const playerId = selectedPlayerId;
  const display = getHeroDisplay(selectedPlayer);

  const quickStats = [
    { label: "Игры", value: String(DEMO_PLAYER.stats.games) },
    { label: "Голы", value: String(DEMO_PLAYER.stats.goals) },
    { label: "Передачи", value: String(DEMO_PLAYER.stats.assists) },
    { label: "Очки", value: String(DEMO_PLAYER.stats.points), accent: true },
  ];

  const goTo = (path: string) => {
    if (!playerId) return;
    triggerHaptic();
    router.push(path as never);
  };

  const selectPlayer = (id: string) => {
    triggerHaptic();
    setSelectedPlayerId(id);
  };

  if (loading) {
    return (
      <FlagshipScreen>
        <HubSkeleton />
      </FlagshipScreen>
    );
  }

  if (hubError) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text style={styles.errorTitle}>Не удалось загрузить игроков</Text>
          <Text style={styles.errorSub}>
            Проверьте подключение и попробуйте снова
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && { opacity: PRESSED_OPACITY },
            ]}
            onPress={() => {
              triggerHaptic();
              setLoading(true);
              loadPlayers();
            }}
          >
            <Text style={styles.retryBtnText}>Повторить</Text>
          </Pressable>
        </View>
      </FlagshipScreen>
    );
  }

  if (players.length === 0) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Нет игроков</Text>
          <Text style={styles.emptySub}>
            Добавьте игрока через тренера или организацию, чтобы видеть профиль и статистику
          </Text>
        </View>
      </FlagshipScreen>
    );
  }

  const showPlayerSwitcher = players.length > 1;

  return (
    <FlagshipScreen scroll={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {showPlayerSwitcher && (
          <AnimatedReanimated.View entering={screenReveal(0)}>
            <SectionCard title="Мои игроки" style={styles.playersSection}>
              <View style={styles.playersList}>
                {players.map((p, index) => (
                  <AnimatedReanimated.View
                    key={p.id}
                    entering={screenReveal(STAGGER + index * 40)}
                  >
                    <PlayerCard
                      player={p}
                      isSelected={p.id === selectedPlayerId}
                      onPress={() => selectPlayer(p.id)}
                    />
                  </AnimatedReanimated.View>
                ))}
              </View>
            </SectionCard>
          </AnimatedReanimated.View>
        )}

        {/* Hero */}
        <AnimatedReanimated.View
          entering={screenReveal(showPlayerSwitcher ? STAGGER : 0)}
          style={styles.heroSection}
        >
          <View style={styles.hero}>
            <ImageBackground
              source={{ uri: display.image }}
              style={StyleSheet.absoluteFill}
              imageStyle={styles.heroImage}
            >
              <LinearGradient
                colors={[
                  "rgba(2,6,23,0.12)",
                  "rgba(2,6,23,0.35)",
                  "rgba(2,6,23,0.78)",
                  "rgba(2,6,23,0.96)",
                ]}
                locations={[0, 0.4, 0.78, 1]}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={["rgba(255,255,255,0.04)", "transparent"]}
                locations={[0, 0.25]}
                style={[StyleSheet.absoluteFill, styles.heroTopHighlight]}
              />
              <LinearGradient
                colors={[
                  "rgba(0,0,0,0.12)",
                  "transparent",
                  "transparent",
                  "rgba(0,0,0,0.18)",
                ]}
                locations={[0, 0.15, 0.5, 1]}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={[
                  "rgba(59,130,246,0.12)",
                  "transparent",
                  "rgba(59,130,246,0.06)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              {Platform.OS === "web" ? (
                <View style={[styles.heroBadge, styles.heroBadgeWeb]}>
                  <Text style={styles.heroBadgeText}>ПРОГРЕСС</Text>
                </View>
              ) : (
                <BlurView intensity={24} tint="dark" style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>ПРОГРЕСС</Text>
                </BlurView>
              )}

              <View style={styles.heroBottom}>
                <View style={styles.heroIdentity}>
                  <Text style={styles.heroNumber}>{display.number}</Text>
                  <Text style={styles.heroName}>{display.name}</Text>
                  <Text style={styles.heroMeta}>
                    {display.position} • {display.team}
                  </Text>
                  <Text style={styles.heroMeta2}>
                    {display.age} лет • {display.city}
                  </Text>
                </View>

                <View style={styles.heroStats}>
                  <LinearGradient
                    colors={["rgba(255,255,255,0.06)", "transparent"]}
                    locations={[0, 0.6]}
                    style={styles.heroStatsHighlight}
                  />
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatValue}>{DEMO_PLAYER.stats.games}</Text>
                    <Text style={styles.heroStatLabel}>Игры</Text>
                  </View>
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatValue}>{DEMO_PLAYER.stats.goals}</Text>
                    <Text style={styles.heroStatLabel}>Голы</Text>
                  </View>
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatValue}>{DEMO_PLAYER.stats.assists}</Text>
                    <Text style={styles.heroStatLabel}>Передачи</Text>
                  </View>
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatValue}>{DEMO_PLAYER.stats.points}</Text>
                    <Text style={styles.heroStatLabel}>Очки</Text>
                  </View>
                </View>
              </View>
            </ImageBackground>
          </View>
        </AnimatedReanimated.View>

        {/* Stats */}
        <AnimatedReanimated.View entering={screenReveal(STAGGER * (showPlayerSwitcher ? 2 : 1))}>
          <Text style={[styles.sectionTitle, !showPlayerSwitcher && styles.sectionTitleFirst]}>
            Статистика
          </Text>
          <Text style={styles.sectionSub}>Премиальный профиль юного хоккеиста</Text>
          <View style={styles.quickStatsWrap}>
            <PremiumStatGrid stats={quickStats} />
          </View>
        </AnimatedReanimated.View>

        {/* Action links */}
        <AnimatedReanimated.View
          entering={screenReveal(STAGGER * (showPlayerSwitcher ? 3 : 2))}
        >
          <Text style={styles.sectionTitle}>Разделы</Text>
          <Text style={styles.sectionSub}>Ключевые разделы игрока</Text>
          <View style={styles.actionsBlock}>
            <ActionLinkCard
              icon="person-outline"
              title="Профиль"
              description="Карточка, статистика, контакты"
              onPress={() => goTo(`/player/${playerId}`)}
            />
            <ActionLinkCard
              icon="card-outline"
              title="Паспорт"
              description="Официальный паспорт игрока"
              onPress={() => goTo(`/player/${playerId}/passport`)}
            />
            <ActionLinkCard
              icon="trending-up"
              title="Развитие"
              description="Прогресс и путь развития"
              onPress={() => goTo(`/player/${playerId}/development`)}
            />
            <ActionLinkCard
              icon="play-circle-outline"
              title="Видео-анализ"
              description="AI-анализ видео выступлений"
              onPress={() => goTo(`/player/${playerId}/video-analysis`)}
            />
          </View>
        </AnimatedReanimated.View>

        {/* Skills */}
        <AnimatedReanimated.View
          entering={screenReveal(STAGGER * (showPlayerSwitcher ? 4 : 3))}
        >
          <SectionCard title="Навыки" style={styles.sectionCard}>
            <SkillBar title="Скорость катания" value={DEMO_PLAYER.attributes.skating} delay={0} />
            <SkillBar title="Мощность броска" value={DEMO_PLAYER.attributes.shot} delay={120} />
            <SkillBar title="Hockey IQ" value={DEMO_PLAYER.attributes.hockeyIQ} delay={240} />
            <SkillBar title="Дисциплина" value={DEMO_PLAYER.attributes.discipline} delay={360} />
          </SectionCard>
        </AnimatedReanimated.View>

        {/* Training */}
        <AnimatedReanimated.View
          entering={screenReveal(STAGGER * (showPlayerSwitcher ? 5 : 4))}
        >
          <SectionCard title="Ближайшая тренировка" style={styles.sectionCard}>
            <View style={styles.trainingTop}>
              <Image source={{ uri: display.coach }} style={styles.coach} />
              <View style={styles.trainingInfo}>
                <Text style={styles.trainingTitle}>Катание</Text>
                <Text style={styles.trainingCoach}>Coach Alexey Morozov</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color={colors.accent} />
              <Text style={styles.infoText}>March 18 • 18:30</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>Ice Arena Center</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: PRESSED_OPACITY },
              ]}
              onPress={() => {
                triggerHaptic();
                router.replace("/(tabs)/schedule");
              }}
            >
              <Text style={styles.primaryBtnText}>Записаться</Text>
            </Pressable>
          </SectionCard>
        </AnimatedReanimated.View>

        {/* AI recommendation */}
        <AnimatedReanimated.View
          entering={screenReveal(STAGGER * (showPlayerSwitcher ? 6 : 5))}
        >
          <SectionCard title="AI-рекомендация" style={styles.sectionCard}>
            <View style={styles.aiHead}>
              <View style={styles.aiIcon}>
                <Ionicons name="sparkles" size={18} color={colors.accent} />
              </View>
              <Text style={styles.aiTitle}>Рекомендация</Text>
            </View>
            <Text style={styles.aiText}>
              {display.name} показывает сильный hockey IQ и хорошее развитие катания. Главный
              фокус: скорость выпуска броска и первый шаг.
            </Text>
          </SectionCard>
        </AnimatedReanimated.View>
      </ScrollView>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollInner: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.screenBottom + 80,
  },

  skeletonContent: { gap: spacing.xl, paddingHorizontal: spacing.screenPadding },
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

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceLevel2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },

  playersSection: { marginBottom: spacing.lg },
  playersList: { gap: spacing.sm },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  playerCardSelected: {
    backgroundColor: "rgba(59,130,246,0.08)",
    borderColor: "rgba(59,130,246,0.25)",
  },
  playerCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLevel2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.lg,
  },
  playerCardAvatarSelected: {
    backgroundColor: colors.accentSoft,
  },
  playerCardInitials: {
    ...typography.cardTitle,
    color: colors.accent,
  },
  playerCardContent: { flex: 1, minWidth: 0 },
  playerCardName: {
    ...typography.cardTitle,
    color: colors.text,
  },
  playerCardMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  heroSection: { marginBottom: spacing.xl },
  hero: {
    height: 280,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "flex-end",
    padding: spacing.lg,
    paddingTop: spacing.md,
    ...shadows.level2,
  },
  heroTopHighlight: { pointerEvents: "none" as const },
  heroImage: { borderRadius: radius.lg },
  heroBadge: {
    position: "absolute" as const,
    top: spacing.md,
    left: spacing.lg,
    borderRadius: radius.capsule,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroBadgeWeb: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heroBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBottom: { marginTop: 0 },
  heroIdentity: { marginBottom: spacing.sm },
  heroNumber: {
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1.5,
  },
  heroName: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  heroMeta2: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  heroStats: {
    flexDirection: "row",
    position: "relative" as const,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 6,
    overflow: "hidden" as const,
  },
  heroStatsHighlight: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: 14,
    pointerEvents: "none" as const,
  },
  heroStatItem: { flex: 1, alignItems: "center" as const },
  heroStatValue: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "900",
  },
  heroStatLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },

  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginTop: spacing.xxl,
  },
  sectionTitleFirst: {
    marginTop: 0,
  },
  sectionSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  quickStatsWrap: { marginBottom: spacing.lg },
  actionsBlock: { marginBottom: spacing.lg },
  sectionCard: {
    borderColor: "rgba(255,255,255,0.08)",
    ...shadows.level1,
    marginBottom: spacing.xl,
  },

  skillBarWrap: { marginBottom: spacing.md },
  skillHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  skillTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  skillNum: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  skillTrack: {
    height: 8,
    borderRadius: radius.capsule,
    overflow: "hidden" as const,
    backgroundColor: colors.glassStrong,
  },
  skillFill: {
    height: "100%",
    borderRadius: radius.capsule,
    overflow: "hidden" as const,
  },

  trainingTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  trainingInfo: { flex: 1 },
  coach: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
  },
  trainingTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "900",
  },
  trainingCoach: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    color: colors.textPrimary,
    fontSize: 13,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: 14,
    marginTop: spacing.sm,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },

  aiHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  aiIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  aiTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  aiText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
});
