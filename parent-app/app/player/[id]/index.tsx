import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, shadows, radius } from "@/constants/theme";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { getFullPlayerProfile, getAIAnalysis } from "@/services/playerService";
import { getVideoAnalyses } from "@/services/videoAnalysisService";
import { getOrCreateConversation, COACH_MARK_ID } from "@/services/chatService";
import { Ionicons } from "@expo/vector-icons";
import { HeroPlayerCard } from "@/components/player/HeroPlayerCard";
import { PlayerScreenBackground } from "@/components/player/PlayerScreenBackground";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { PremiumStatGrid, SkeletonBlock } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import {
  SectionCard,
  ProgressTimelineCard,
  ScheduleItemRow,
} from "@/components/player-passport";
import { PressableCard } from "@/components/ui/PressableCard";
import { SharePlayerSheet } from "@/components/player/SharePlayerSheet";
import {
  isDemoPlayer,
  getHeroProps as getHeroPropsHelper,
  getQuickStats as getQuickStatsHelper,
} from "@/helpers/playerProfileHelpers";
import { DEMO_PLAYER } from "@/constants/demoPlayer";
import type {
  Player,
  PlayerStats,
  ScheduleItem,
  Recommendation,
  PlayerAIAnalysis,
  PlayerProgressSnapshot,
  AchievementsResponse,
  VideoAnalysisRequest,
} from "@/types";

const PRESSED_OPACITY = 0.88;
type ProfileErrorStateKind = "not_found" | "network";

const PROFILE_ERROR_CONTENT: Record<
  ProfileErrorStateKind,
  { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }
> = {
  not_found: {
    icon: "person-outline",
    title: "Игрок не найден",
    subtitle: "Проверьте ссылку или выберите другого игрока",
  },
  network: {
    icon: "cloud-offline-outline",
    title: "Ошибка загрузки",
    subtitle: "Не удалось получить данные игрока. Проверьте соединение и попробуйте снова",
  },
};

function ProfileSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={200} style={styles.skeletonHero} />
      <View style={styles.skeletonStats}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} height={76} style={styles.skeletonStatBlock} />
        ))}
      </View>
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
    </View>
  );
}

function ProfileHeader({
  insetTop,
  onBack,
  onShare,
  showShareButton = false,
}: {
  insetTop: number;
  onBack: () => void;
  onShare?: () => void;
  showShareButton?: boolean;
}) {
  return (
    <View style={[styles.customHeader, { paddingTop: insetTop + spacing.lg }]}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </Pressable>
      <Text style={styles.headerTitle}>Профиль игрока</Text>
      {showShareButton ? (
        <Pressable
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: PRESSED_OPACITY }]}
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="Поделиться"
        >
          <Ionicons name="share-outline" size={24} color="#ffffff" />
        </Pressable>
      ) : (
        <View style={styles.headerBtn} />
      )}
    </View>
  );
}

function ProfileErrorState({
  type,
  onRetry,
}: {
  type: ProfileErrorStateKind;
  onRetry: () => void;
}) {
  const content = PROFILE_ERROR_CONTENT[type];

  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconWrap}>
        <Ionicons name={content.icon} size={40} color={colors.textMuted} />
      </View>
      <Text style={styles.errorTitle}>{content.title}</Text>
      <Text style={styles.errorSub}>{content.subtitle}</Text>
      <Pressable
        style={({ pressed }) => [styles.retryBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Повторить"
      >
        <Text style={styles.retryBtnText}>Повторить</Text>
      </Pressable>
    </View>
  );
}

/**
 * Player profile screen. States:
 * - loading: initial fetch, show ProfileSkeleton
 * - not_found: server returned no player (profileError === "not_found")
 * - api error: timeout/fetch/server error (profileError === "network")
 * - ready: player loaded, main content + lazy video/AI
 */
export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<PlayerAIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [progressHistory, setProgressHistory] = useState<PlayerProgressSnapshot[]>([]);
  const [achievements, setAchievements] = useState<AchievementsResponse | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<ProfileErrorStateKind | null>(null);
  const [videoAnalyses, setVideoAnalyses] = useState<VideoAnalysisRequest[]>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [aiRequested, setAiRequested] = useState(false);
  const mountedRef = useRef(true);
  const profileRequestRef = useRef(0);
  const aiRequestRef = useRef(0);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const goBack = useCallback(() => {
    triggerHaptic();
    router.back();
  }, [router]);

  const openShareSheet = useCallback(() => {
    triggerHaptic();
    setShareSheetVisible(true);
  }, []);

  const loadProfile = useCallback(async () => {
    const requestId = ++profileRequestRef.current;
    const canCommit = () => mountedRef.current && requestId === profileRequestRef.current;

    if (!id || typeof id !== "string") {
      if (canCommit()) {
        setPlayer(null);
        setProfileError("not_found");
        setLoading(false);
      }
      return;
    }

    if (!user?.id) {
      if (canCommit()) {
        setPlayer(null);
        setProfileError("network");
        setLoading(false);
      }
      return;
    }

    if (canCommit()) {
      setLoading(true);
      setProfileError(null);
    }

    try {
      const profile = await getFullPlayerProfile(id, user.id, {
        includeVideoAnalyses: false,
      });

      if (!canCommit()) return;

      if (profile) {
        setPlayer(profile.player);
        setStats(profile.stats);
        setSchedule(profile.schedule ?? []);
        setRecommendations(profile.recommendations ?? []);
        setProgressHistory(profile.progressHistory ?? []);
        setAchievements(profile.achievements ?? null);
        setProfileError(null);
      } else {
        setPlayer(null);
        setStats(null);
        setSchedule([]);
        setRecommendations([]);
        setProgressHistory([]);
        setAchievements(null);
        setProfileError("not_found");
      }
    } catch {
      if (canCommit()) {
        setPlayer(null);
        setStats(null);
        setSchedule([]);
        setRecommendations([]);
        setProgressHistory([]);
        setAchievements(null);
        setProfileError("network");
      }
    } finally {
      if (canCommit()) setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Lazy load video analyses (with unmount guard)
  useEffect(() => {
    if (!id || typeof id !== "string" || !user?.id || loading) return;
    let cancelled = false;
    setVideoLoading(true);
    getVideoAnalyses(id, user.id)
      .then((videos) => {
        if (!cancelled)
          setVideoAnalyses(Array.isArray(videos) ? videos : []);
      })
      .catch(() => {
        if (!cancelled) setVideoAnalyses([]);
      })
      .finally(() => {
        if (!cancelled) setVideoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, user?.id, loading]);

  const fetchAIAnalysis = useCallback(() => {
    if (!id || typeof id !== "string" || !user?.id) return;
    const requestId = ++aiRequestRef.current;
    const canCommit = () => mountedRef.current && requestId === aiRequestRef.current;

    setAiRequested(true);
    setAiLoading(true);
    setAiError(null);
    getAIAnalysis(id, user.id)
      .then((data) => {
        if (!canCommit()) return;
        setAiAnalysis(data ?? null);
        if (!data) setAiError("Не удалось загрузить анализ");
      })
      .catch(() => {
        if (canCommit()) setAiError("Ошибка загрузки");
      })
      .finally(() => {
        if (canCommit()) setAiLoading(false);
      });
  }, [id, user?.id]);

  const openVideoAnalysis = () => {
    if (!id) return;
    router.push(`/player/${id}/video-analysis`);
  };

  const openChat = async () => {
    if (!id || !user?.id || chatLoading) return;
    setChatLoading(true);
    try {
      const conv = await getOrCreateConversation(user.id, id);
      if (!mountedRef.current) return;
      if (conv) router.push(`/chat/${conv.id}`);
      else Alert.alert("Ошибка", "Не удалось открыть чат. Попробуйте позже.");
    } catch {
      if (mountedRef.current) Alert.alert("Ошибка", "Не удалось открыть чат. Попробуйте позже.");
    } finally {
      if (mountedRef.current) setChatLoading(false);
    }
  };

  const isDemo = isDemoPlayer(player);
  const heroProps = player ? getHeroPropsHelper(player, stats, isDemo) : null;
  const quickStats = getQuickStatsHelper(stats, isDemo);

  const devAttributes = isDemo ? DEMO_PLAYER.attributes : null;

  if (loading) {
    return (
      <View style={styles.screenWrap}>
        <PlayerScreenBackground />
        <SafeAreaView style={styles.container} edges={["bottom"]}>
          <ProfileHeader insetTop={insets.top} onBack={goBack} />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <ProfileSkeleton />
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (!player) {
    const errorType = profileError ?? "network";

    return (
      <View style={styles.screenWrap}>
        <PlayerScreenBackground />
        <SafeAreaView style={styles.container} edges={["bottom"]}>
          <ProfileHeader insetTop={insets.top} onBack={goBack} />
          <ProfileErrorState
            type={errorType}
            onRetry={() => {
              triggerHaptic();
              loadProfile();
            }}
          />
        </SafeAreaView>
      </View>
    );
  }

  const schedulePreview = Array.isArray(schedule) ? schedule.slice(0, 3) : [];
  const recommendationsPreview = (recommendations ?? []).slice(0, 4);

  return (
    <View style={styles.screenWrap}>
      <PlayerScreenBackground />
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ProfileHeader
          insetTop={insets.top}
          onBack={goBack}
          onShare={openShareSheet}
          showShareButton
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Hero — flagship premium block */}
          <Animated.View
            style={styles.heroSection}
            entering={screenReveal(0)}
          >
            <View style={styles.heroGlowWrap}>
              <LinearGradient
                colors={[
                  "rgba(59,130,246,0.12)",
                  "rgba(59,130,246,0.04)",
                  "transparent",
                ]}
                style={styles.heroGlow}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
              {heroProps && <HeroPlayerCard {...heroProps} />}
            </View>
            {quickStats.length > 0 && (
              <View style={styles.quickStatsWrap}>
                <PremiumStatGrid stats={quickStats} />
              </View>
            )}
          </Animated.View>

          {/* Развитие навыков (demo only) */}
        {devAttributes && (
          <Animated.View entering={screenReveal(STAGGER * 1)}>
            <SectionCard title="Развитие навыков" style={styles.sectionCard}>
              <View style={styles.devSkillsRow}>
                <View style={styles.devSkillCard}>
                  <Text style={styles.devSkillValue}>{devAttributes.skating}</Text>
                  <Text style={styles.devSkillLabel}>Катание</Text>
                </View>
                <View style={styles.devSkillCard}>
                  <Text style={styles.devSkillValue}>{devAttributes.shot}</Text>
                  <Text style={styles.devSkillLabel}>Бросок</Text>
                </View>
                <View style={styles.devSkillCard}>
                  <Text style={styles.devSkillValue}>{devAttributes.passing}</Text>
                  <Text style={styles.devSkillLabel}>Пас</Text>
                </View>
                <View style={styles.devSkillCard}>
                  <Text style={styles.devSkillValue}>{devAttributes.hockeyIQ}</Text>
                  <Text style={styles.devSkillLabel}>Хоккейный IQ</Text>
                </View>
                <View style={styles.devSkillCard}>
                  <Text style={styles.devSkillValue}>{devAttributes.discipline}</Text>
                  <Text style={styles.devSkillLabel}>Дисциплина</Text>
                </View>
                <View style={styles.devSkillCard}>
                  <Text style={styles.devSkillValue}>{devAttributes.physical}</Text>
                  <Text style={styles.devSkillLabel}>Физика</Text>
                </View>
              </View>
            </SectionCard>
          </Animated.View>
        )}

        {/* Primary actions */}
        <Animated.View
          style={styles.actionsBlock}
          entering={screenReveal(STAGGER * 2)}
        >
          <ActionLinkCard
            icon="card-outline"
            title="Паспорт игрока"
            description="Официальный цифровой паспорт хоккеиста"
            onPress={() => {
              triggerHaptic();
              id && router.push(`/player/${id}/passport`);
            }}
            variant="default"
          />

          <ActionLinkCard
            icon="sparkles"
            title="AI анализ игрока"
            description="Узнайте сильные стороны, зоны роста и персональные рекомендации"
            onPress={() => {
              triggerHaptic();
              id && router.push(`/player/${id}/ai-analysis`);
            }}
            variant="accent"
          />

          <ActionLinkCard
            icon="chatbubbles"
            title="Спросить Coach Mark"
            description="Персональный AI-тренер для родителей"
            onPress={() => {
              if (__DEV__) console.log("[CoachMark] BEFORE tap — Спросить Coach Mark");
              triggerHaptic();
              id && router.push(`/chat/${COACH_MARK_ID}?playerId=${encodeURIComponent(id)}`);
            }}
            variant="default"
          />

          <ActionLinkCard
            icon="folder-open-outline"
            title="Coach Mark Hub"
            description="Заметки, планы и календарь"
            onPress={() => {
              if (__DEV__) console.log("[CoachMark] BEFORE tap — Coach Mark Hub");
              triggerHaptic();
              id && router.push(`/coach-mark?playerId=${encodeURIComponent(id)}`);
            }}
            variant="default"
          />

        {/* Chat with coach */}
        <PressableCard
          onPress={() => {
            triggerHaptic();
            openChat();
          }}
          accessibilityLabel="Открыть чат с тренером"
          disabled={chatLoading}
          style={styles.chatCard}
          pressedStyle={styles.chatCardPressed}
        >
          <View style={styles.chatCardInner}>
            <View style={styles.chatIconWrap}>
              <Ionicons name="person" size={22} color={colors.accent} />
            </View>
            <View style={styles.chatCardText}>
              <Text style={styles.chatCardTitle}>Чат с тренером</Text>
              <Text style={styles.chatCardDesc}>Обсудите тренировки и прогресс</Text>
            </View>
            {chatLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            )}
          </View>
        </PressableCard>
        </Animated.View>

        {/* AI Анализ */}
        <Animated.View entering={screenReveal(STAGGER * 3)}>
        <SectionCard title="AI Анализ" style={styles.sectionCard}>
          {aiLoading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.stateBlockText}>Загрузка анализа...</Text>
            </View>
          ) : aiError ? (
            <View>
              <Text style={styles.aiErrorText}>{aiError}</Text>
              <Pressable
                style={({ pressed }) => [styles.btn, pressed && { opacity: PRESSED_OPACITY }]}
                onPress={() => {
                  triggerHaptic();
                  fetchAIAnalysis();
                }}
              >
                <Text style={styles.btnText}>Повторить</Text>
              </Pressable>
            </View>
          ) : !aiRequested ? (
            <View style={styles.aiIdleBlock}>
              <Text style={styles.aiEmptyText}>
                Получите AI-анализ на основе загруженных видео игр и тренировок.
              </Text>
              <View style={styles.aiIdleActions}>
                <Pressable
                  style={({ pressed }) => [styles.btn, pressed && { opacity: PRESSED_OPACITY }]}
                  onPress={() => {
                    triggerHaptic();
                    fetchAIAnalysis();
                  }}
                >
                  <Text style={styles.btnText}>Загрузить AI анализ</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: PRESSED_OPACITY }]}
                  onPress={() => {
                    triggerHaptic();
                    openVideoAnalysis();
                  }}
                >
                <Ionicons name="videocam" size={20} color="#ffffff" />
                <Text style={styles.uploadBtnText}>Загрузить видео</Text>
              </Pressable>
              </View>
            </View>
          ) : aiAnalysis ? (
            <View>
              {aiAnalysis.summary ? (
                <View style={styles.aiBlock}>
                  <Text style={styles.aiLabel}>Краткий вывод</Text>
                  <Text style={styles.aiValue}>{aiAnalysis.summary}</Text>
                </View>
              ) : null}
              {(aiAnalysis.strengths ?? []).length > 0 && (
                <View style={styles.aiBlock}>
                  <Text style={styles.aiLabel}>Сильные стороны</Text>
                  {(aiAnalysis.strengths ?? []).map((s, i) => (
                    <View key={i} style={styles.aiListItem}>
                      <Text style={styles.aiBullet}>•</Text>
                      <Text style={styles.aiListText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}
              {(aiAnalysis.growthAreas ?? []).length > 0 && (
                <View style={styles.aiBlock}>
                  <Text style={styles.aiLabel}>Зоны роста</Text>
                  {(aiAnalysis.growthAreas ?? []).map((s, i) => (
                    <View key={i} style={styles.aiListItem}>
                      <Text style={styles.aiBullet}>•</Text>
                      <Text style={styles.aiListText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}
              {(aiAnalysis.coachFocus ?? []).length > 0 ? (
                <View style={styles.aiBlock}>
                  <Text style={styles.aiLabel}>Фокус тренера</Text>
                  <Text style={styles.aiValue}>{aiAnalysis.coachFocus.join(", ")}</Text>
                </View>
              ) : null}
              {aiAnalysis.motivation ? (
                <View style={[styles.aiBlock, styles.aiBlockLast]}>
                  <Text style={styles.aiLabel}>Мотивация</Text>
                  <Text style={[styles.aiValue, styles.aiMotivation]}>
                    {aiAnalysis.motivation}
                  </Text>
                </View>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.btn, pressed && { opacity: PRESSED_OPACITY }]}
                onPress={() => {
                  triggerHaptic();
                  fetchAIAnalysis();
                }}
              >
                <Text style={styles.btnText}>Обновить анализ</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={styles.aiEmptyText}>
                AI анализ пока недоступен. Загрузите видео для анализа.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: PRESSED_OPACITY }]}
                onPress={() => {
                  triggerHaptic();
                  openVideoAnalysis();
                }}
              >
                <Ionicons name="videocam" size={20} color="#ffffff" />
                <Text style={styles.uploadBtnText}>Загрузить видео</Text>
              </Pressable>
            </View>
          )}
        </SectionCard>
        </Animated.View>

        {/* Video Analysis */}
        <Animated.View entering={screenReveal(STAGGER * 4)}>
        <SectionCard title="Видео анализ" style={styles.sectionCard}>
          {videoLoading ? (
            <View style={styles.videoSkeletonWrap}>
              <SkeletonBlock height={44} style={styles.videoSkeletonRow} />
              <SkeletonBlock height={44} style={styles.videoSkeletonRow} />
              <SkeletonBlock height={44} style={styles.videoSkeletonRowLast} />
            </View>
          ) : videoAnalyses.length > 0 ? (
            <>
              <Text style={styles.videoCountText}>
                Доступно анализов: {videoAnalyses.length}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: PRESSED_OPACITY }]}
                onPress={() => {
                  triggerHaptic();
                  openVideoAnalysis();
                }}
              >
                <Ionicons name="videocam" size={20} color="#ffffff" />
                <Text style={styles.uploadBtnText}>Открыть AI видео-анализ</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.videoEmptyWrap}>
              <View style={styles.videoEmptyIconWrap}>
                <Ionicons name="videocam-outline" size={28} color={colors.textMuted} />
              </View>
              <Text style={styles.placeholder}>Загрузите видео тренировки для AI-анализа</Text>
              <Pressable
                style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: PRESSED_OPACITY }]}
                onPress={() => {
                  triggerHaptic();
                  openVideoAnalysis();
                }}
              >
                <Ionicons name="videocam" size={20} color="#ffffff" />
                <Text style={styles.uploadBtnText}>Загрузить видео</Text>
              </Pressable>
            </View>
          )}
        </SectionCard>
        </Animated.View>

        {/* История прогресса + Development action cards */}
        <Animated.View entering={screenReveal(STAGGER * 5)}>
        <SectionCard title="История прогресса" style={styles.sectionCard}>
          {progressHistory.length === 0 ? (
            <Text style={styles.placeholder}>
              История прогресса пока недоступна
            </Text>
          ) : (
            progressHistory.map((s) => (
              <ProgressTimelineCard
                key={s.id}
                month={s.month}
                year={s.year}
                games={s.games}
                goals={s.goals}
                assists={s.assists}
                points={s.points}
                trend={s.trend}
                attendancePercent={s.attendancePercent}
                coachComment={s.coachComment}
                focusArea={s.focusArea}
              />
            ))
          )}
        </SectionCard>

        {/* AI Coach Report */}
        <ActionLinkCard
          icon="sparkles"
          title="Отчёт AI-тренера"
          description="Сильные стороны, зоны роста и рекомендации AI"
          onPress={() => {
            triggerHaptic();
            id && router.push(`/player/${id}/ai-report`);
          }}
          variant="accent"
        />

        {/* План развития */}
        <ActionLinkCard
          icon="list"
          title="План развития"
          description="Персональный план на 4 недели"
          onPress={() => {
            triggerHaptic();
            id && router.push(`/player/${id}/development-plan`);
          }}
          variant="success"
        />

        {/* История развития */}
        <ActionLinkCard
          icon="trending-up"
          title="История развития"
          description="Прогресс, достижения и комментарии тренеров"
          onPress={() => {
            triggerHaptic();
            id && router.push(`/player/${id}/development`);
          }}
          variant="default"
        />
        </Animated.View>

        {/* Достижения */}
        <Animated.View entering={screenReveal(STAGGER * 6)}>
        <ActionLinkCard
          icon="trophy"
          title="Достижения"
          description={
            !achievements
              ? "Значки и цели игрока"
              : achievements.unlocked.length === 0 && achievements.locked.length === 0
                ? "Пока нет достижений"
                : `${achievements.unlocked.length} получено · ${achievements.locked.length} впереди`
          }
          onPress={() => {
            triggerHaptic();
            id && router.push(`/player/${id}/achievements`);
          }}
          variant="default"
        />

        {/* Ближайшее расписание */}
        <SectionCard title="Ближайшее расписание" style={styles.sectionCard}>
          {schedulePreview.length === 0 ? (
            <Text style={styles.placeholder}>Нет запланированных мероприятий</Text>
          ) : (
            schedulePreview.map((item, index) => (
              <ScheduleItemRow
                key={item.id}
                day={item.day}
                title={item.title}
                time={item.time}
                isLast={index === schedulePreview.length - 1}
              />
            ))
          )}
        </SectionCard>

        {/* G) Рекомендации тренера */}
        {recommendationsPreview.length > 0 && (
          <SectionCard title="Рекомендации тренера" style={styles.sectionCard}>
            {recommendationsPreview.map((rec) => (
              <View key={rec.id} style={styles.recRow}>
                <Text style={styles.recBullet}>•</Text>
                <Text style={styles.recText} numberOfLines={4} ellipsizeMode="tail">{rec.text}</Text>
              </View>
            ))}
          </SectionCard>
        )}

        {/* H) Информация о родителе */}
        <SectionCard title="Информация" style={styles.sectionCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Родитель</Text>
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">{player.parentName ?? "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Возраст</Text>
            <Text style={styles.infoValue}>
              {player.age != null ? `${player.age} лет` : "—"}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Команда</Text>
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">{player.team ?? "—"}</Text>
          </View>
        </SectionCard>
        </Animated.View>

        <View style={[styles.bottomSpacer, { height: spacing.xxl + insets.bottom }]} />
      </ScrollView>

      <SharePlayerSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        name={player.name ?? "Игрок"}
        position={player.position ?? undefined}
        team={player.team ?? undefined}
        number={player.number}
        age={player.age}
        city={isDemo ? DEMO_PLAYER.city : undefined}
        photo={isDemo ? { uri: DEMO_PLAYER.image } : null}
        stats={
          stats
            ? {
                games: stats.games,
                goals: stats.goals,
                assists: stats.assists,
                points: stats.points,
              }
            : undefined
        }
      />
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scroll: { flex: 1 },
  skeletonContent: {
    gap: spacing.xl,
  },
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
  videoSkeletonWrap: {
    paddingVertical: spacing.md,
  },
  videoSkeletonRow: {
    height: 44,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  videoSkeletonRowLast: {
    height: 44,
    borderRadius: radius.sm,
  },
  videoEmptyWrap: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  videoEmptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.screenBottom + 48,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: "center",
  },
  errorSub: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 280,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    color: "#ffffff",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsBlock: {
    marginBottom: spacing.lg,
  },
  chatCard: {
    marginBottom: spacing.xl,
  },
  chatCardInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  chatCardPressed: { opacity: PRESSED_OPACITY },
  chatIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(46, 167, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  chatCardText: { flex: 1 },
  chatCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    color: "#ffffff",
  },
  chatCardDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  placeholder: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.xl,
    lineHeight: 22,
  },
  videoCountText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 12,
  },
  stateBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: spacing.lg,
  },
  stateBlockText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  aiErrorText: {
    fontSize: 14,
    color: colors.errorText,
    marginBottom: 12,
  },
  aiBlock: { marginBottom: 16 },
  aiIdleBlock: {
    gap: 0,
  },
  aiIdleActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  aiEmptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  aiBlockLast: { marginBottom: 12 },
  aiLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 6,
  },
  aiValue: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.95)",
    lineHeight: 22,
  },
  aiListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  aiBullet: {
    fontSize: 14,
    color: colors.accent,
    marginRight: 8,
  },
  aiListText: {
    flex: 1,
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 22,
  },
  aiMotivation: { fontWeight: "500" },
  btn: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  screenWrap: {
    flex: 1,
    position: "relative",
  },
  heroSection: {
    marginBottom: spacing.xxl,
  },
  heroGlowWrap: {
    position: "relative",
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    left: -20,
    right: -20,
    height: 280,
    borderRadius: 24,
    opacity: 0.9,
  },
  quickStatsWrap: {
    marginTop: spacing.xl,
  },
  sectionCard: {
    backgroundColor: colors.surfaceLevel1,
    borderColor: colors.surfaceLevel1Border,
    ...shadows.level1,
    marginBottom: spacing.xl,
  },
  devSkillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  devSkillCard: {
    flex: 1,
    minWidth: 95,
    backgroundColor: colors.surfaceLightAlt,
    borderRadius: radius.md,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  devSkillValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  devSkillLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
    marginBottom: 16,
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  recRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  recBullet: {
    fontSize: 14,
    color: colors.accent,
    marginRight: 10,
  },
  recText: {
    flex: 1,
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    color: "#ffffff",
    marginLeft: spacing.md,
    textAlign: "right",
  },
  bottomSpacer: { height: spacing.xxl },
});
