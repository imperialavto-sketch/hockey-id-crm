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
import {
  getFullPlayerProfile,
  getAIAnalysis,
  getPlayerAttendanceSummary,
  getPlayerCoachMaterials,
  type PlayerAttendanceSummary,
  type LatestSessionEvaluation,
  type EvaluationSummary,
  type LatestSessionReport,
  type ParentPlayerCoachMaterials,
} from "@/services/playerService";
import { getVideoAnalyses } from "@/services/videoAnalysisService";
import { getOrCreateConversation, COACH_MARK_ID } from "@/services/chatService";
import { Ionicons } from "@expo/vector-icons";
import { HeroPlayerCard } from "@/components/player/HeroPlayerCard";
import { PlayerScreenBackground } from "@/components/player/PlayerScreenBackground";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { PremiumStatGrid, SkeletonBlock, PrimaryButton } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import {
  SectionCard,
  ProgressTimelineCard,
  ScheduleItemRow,
} from "@/components/player-passport";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { PressableCard } from "@/components/ui/PressableCard";
import { SharePlayerSheet } from "@/components/player/SharePlayerSheet";
import {
  isDemoPlayer,
  getHeroProps as getHeroPropsHelper,
  getQuickStats as getQuickStatsHelper,
} from "@/helpers/playerProfileHelpers";
import { DEMO_PLAYER } from "@/constants/demoPlayer";
import {
  CM_COPY,
  CM_VOICE_LABEL,
  coachHubReportTitle,
  coachHubReportPreview,
  coachHubActionPreview,
  coachHubActionTitle,
  coachHubDraftPreview,
  formatActionItemStatusLabel,
} from "@/lib/coachMaterialsUi";
import { PLAYER_PROFILE_COPY } from "@/lib/parentPlayerProfileUi";
import { PARENT_FLAGSHIP } from "@/lib/parentFlagshipShared";
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

const PROFILE_ERROR_DETAILS: Record<
  ProfileErrorStateKind,
  { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }
> = {
  not_found: {
    icon: "person-outline",
    title: PLAYER_PROFILE_COPY.notFoundTitle,
    subtitle: PLAYER_PROFILE_COPY.notFoundSubtitle,
  },
  network: {
    icon: "cloud-offline-outline",
    title: PLAYER_PROFILE_COPY.networkErrorTitle,
    subtitle: PLAYER_PROFILE_COPY.networkErrorSubtitle,
  },
};

function ProfileSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <Text style={styles.profileLoadingHint}>{PLAYER_PROFILE_COPY.loadingHint}</Text>
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
  onBack,
  onShare,
  showShareButton = false,
}: {
  onBack: () => void;
  onShare?: () => void;
  showShareButton?: boolean;
}) {
  return (
    <ScreenHeader
      title="Профиль игрока"
      onBack={onBack}
      rightAction={
        showShareButton ? (
          <Pressable
            style={({ pressed }) => [
              { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
              pressed && { opacity: PRESSED_OPACITY },
            ]}
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel="Поделиться"
          >
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </Pressable>
        ) : undefined
      }
    />
  );
}

const EMPTY_EVALUATION_SUMMARY: EvaluationSummary = {
  totalEvaluations: 0,
  avgEffort: null,
  avgFocus: null,
  avgDiscipline: null,
};

function renderEvaluationSummary(summary: EvaluationSummary) {
  if (summary.totalEvaluations === 0) {
    return (
      <Text style={styles.evalEmpty}>
        Пока недостаточно данных для средней оценки
      </Text>
    );
  }
  const avgLine = (label: string, avg: number | null) => {
    if (avg == null) return null;
    return (
      <Text style={styles.evalLine}>
        {label}: {avg.toFixed(1)}/5
      </Text>
    );
  };
  return (
    <View style={styles.evalBlock}>
      {avgLine("Старание", summary.avgEffort)}
      {avgLine("Концентрация", summary.avgFocus)}
      {avgLine("Дисциплина", summary.avgDiscipline)}
      <Text style={styles.evalSummaryCount}>
        Тренировок с оценкой: {summary.totalEvaluations}
      </Text>
    </View>
  );
}

function formatSessionReportUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso.trim();
  }
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function coachMaterialsHasContent(m: ParentPlayerCoachMaterials): boolean {
  return (
    m.reports.length > 0 ||
    m.actions.length > 0 ||
    m.parentDrafts.length > 0
  );
}

function renderTrainerSessionReport(report: LatestSessionReport | null) {
  if (report == null) {
    return (
      <Text style={styles.evalEmpty}>
        Тренер пока не добавил комментарий
      </Text>
    );
  }
  const main =
    report.parentMessage?.trim() ||
    report.summary?.trim() ||
    report.coachNote?.trim() ||
    "";
  const focus = report.focusAreas?.trim() ?? "";
  const updatedRaw = report.updatedAt?.trim();

  if (!main && !focus) {
    return (
      <Text style={styles.evalEmpty}>
        Тренер пока не добавил комментарий
      </Text>
    );
  }
  return (
    <View style={styles.evalBlockCompact}>
      {main ? <Text style={styles.reportMain}>{main}</Text> : null}
      {focus ? (
        <Text style={[styles.evalNote, !main && styles.evalNoteTightTop]}>
          На тренировке работали: {focus}
        </Text>
      ) : null}
      {updatedRaw ? (
        <Text style={styles.reportUpdatedAt}>
          Обновлено: {formatSessionReportUpdatedAt(updatedRaw)}
        </Text>
      ) : null}
    </View>
  );
}

function renderLastSessionEvaluation(ev: LatestSessionEvaluation | null) {
  const scoreLine = (label: string, n?: number) => {
    if (n == null || n < 1 || n > 5) return null;
    return (
      <Text style={styles.evalLine}>
        {label}: {n}/5
      </Text>
    );
  };
  const hasScores =
    (ev?.effort != null && ev.effort >= 1 && ev.effort <= 5) ||
    (ev?.focus != null && ev.focus >= 1 && ev.focus <= 5) ||
    (ev?.discipline != null && ev.discipline >= 1 && ev.discipline <= 5);
  const note = ev?.note?.trim();
  if (!hasScores && !note) {
    return (
      <Text style={styles.evalEmpty}>Пока нет оценки от тренера</Text>
    );
  }
  return (
    <View style={styles.evalBlock}>
      {scoreLine("Старание", ev?.effort)}
      {scoreLine("Концентрация", ev?.focus)}
      {scoreLine("Дисциплина", ev?.discipline)}
      {note ? <Text style={styles.evalNote}>{note}</Text> : null}
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
  const content = PROFILE_ERROR_DETAILS[type];

  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconWrap}>
        <Ionicons name={content.icon} size={40} color={colors.textMuted} />
      </View>
      <Text style={styles.errorTitle}>{content.title}</Text>
      <Text style={styles.errorSub}>{content.subtitle}</Text>
      <PrimaryButton
        label="Повторить"
        onPress={onRetry}
      />
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
  const [attendanceSummary, setAttendanceSummary] =
    useState<PlayerAttendanceSummary | null>(null);
  const [latestSessionEvaluation, setLatestSessionEvaluation] =
    useState<LatestSessionEvaluation | null>(null);
  const [evaluationSummary, setEvaluationSummary] = useState<EvaluationSummary>(
    () => ({ ...EMPTY_EVALUATION_SUMMARY })
  );
  const [latestSessionReport, setLatestSessionReport] =
    useState<LatestSessionReport | null>(null);
  const [coachMaterials, setCoachMaterials] =
    useState<ParentPlayerCoachMaterials | null>(null);
  const [coachMaterialsLoading, setCoachMaterialsLoading] = useState(false);
  const [coachMaterialsError, setCoachMaterialsError] = useState<string | null>(
    null
  );
  const mountedRef = useRef(true);
  const profileRequestRef = useRef(0);
  const aiRequestRef = useRef(0);
  const coachMaterialsFetchGen = useRef(0);

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
      setLatestSessionEvaluation(null);
      setEvaluationSummary({ ...EMPTY_EVALUATION_SUMMARY });
      setLatestSessionReport(null);
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
        setLatestSessionEvaluation(profile.latestSessionEvaluation ?? null);
        setEvaluationSummary(
          profile.evaluationSummary ?? { ...EMPTY_EVALUATION_SUMMARY }
        );
        setLatestSessionReport(profile.latestSessionReport ?? null);
        setProfileError(null);
      } else {
        setPlayer(null);
        setStats(null);
        setSchedule([]);
        setRecommendations([]);
        setProgressHistory([]);
        setAchievements(null);
        setLatestSessionEvaluation(null);
        setEvaluationSummary({ ...EMPTY_EVALUATION_SUMMARY });
        setLatestSessionReport(null);
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
        setLatestSessionEvaluation(null);
        setEvaluationSummary({ ...EMPTY_EVALUATION_SUMMARY });
        setLatestSessionReport(null);
        setProfileError("network");
      }
    } finally {
      if (canCommit()) setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!id || typeof id !== "string" || !user?.id) {
      setAttendanceSummary(null);
      return;
    }
    let cancelled = false;
    setAttendanceSummary(null);
    getPlayerAttendanceSummary(id, user.id)
      .then((s) => {
        if (!cancelled) setAttendanceSummary(s);
      })
      .catch(() => {
        if (!cancelled) setAttendanceSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  const loadCoachMaterials = useCallback(async () => {
    if (!id || typeof id !== "string" || !user?.id) return;
    const gen = ++coachMaterialsFetchGen.current;
    setCoachMaterialsLoading(true);
    setCoachMaterialsError(null);
    try {
      const m = await getPlayerCoachMaterials(id, user.id);
      if (!mountedRef.current || gen !== coachMaterialsFetchGen.current) return;
      setCoachMaterials(m);
      setCoachMaterialsError(null);
    } catch {
      if (!mountedRef.current || gen !== coachMaterialsFetchGen.current) return;
      setCoachMaterials(null);
      setCoachMaterialsError(CM_COPY.fetchErrorHub);
    } finally {
      if (mountedRef.current && gen === coachMaterialsFetchGen.current) {
        setCoachMaterialsLoading(false);
      }
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (!id || typeof id !== "string" || !user?.id || loading) return;
    void loadCoachMaterials();
  }, [id, user?.id, loading, loadCoachMaterials]);

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
          <ProfileHeader onBack={goBack} />
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
          <ProfileHeader onBack={goBack} />
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

  const showCoachMaterialsSection =
    coachMaterialsLoading ||
    coachMaterialsError != null ||
    (coachMaterials != null && coachMaterialsHasContent(coachMaterials));

  const latestCoachReport = coachMaterials?.reports[0];
  const coachActionsPreview = coachMaterials?.actions.slice(0, 3) ?? [];
  const latestParentDraft = coachMaterials?.parentDrafts[0];

  return (
    <View style={styles.screenWrap}>
      <PlayerScreenBackground />
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ProfileHeader
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
            {attendanceSummary != null &&
            (attendanceSummary.totalSessions > 0 ||
              attendanceSummary.presentCount > 0 ||
              attendanceSummary.attendanceRate > 0) ? (
              <View style={styles.attendanceSummaryWrap}>
                <Text style={styles.attendanceSummaryPrimary}>
                  Посещаемость: {attendanceSummary.attendanceRate}%
                </Text>
                <Text style={styles.attendanceSummarySecondary}>
                  {attendanceSummary.presentCount} из{" "}
                  {attendanceSummary.totalSessions} тренировок
                </Text>
              </View>
            ) : null}
          </Animated.View>

          <Animated.View entering={screenReveal(STAGGER * 0.25)}>
            <SectionCard title="Последняя тренировка" style={styles.sectionCard}>
              {renderLastSessionEvaluation(latestSessionEvaluation)}
            </SectionCard>
          </Animated.View>

          <Animated.View entering={screenReveal(STAGGER * 0.275)}>
            <SectionCard title="Комментарий тренера" style={styles.sectionCard}>
              {renderTrainerSessionReport(latestSessionReport)}
            </SectionCard>
          </Animated.View>

          <Animated.View entering={screenReveal(STAGGER * 0.3)}>
            <SectionCard title="Средняя оценка" style={styles.sectionCard}>
              {renderEvaluationSummary(evaluationSummary)}
            </SectionCard>
          </Animated.View>

          {showCoachMaterialsSection ? (
            <Animated.View entering={screenReveal(STAGGER * 0.31)}>
              <SectionCard
                title="После тренировок"
                subtitle={
                  coachMaterialsLoading || coachMaterialsError
                    ? undefined
                    : PLAYER_PROFILE_COPY.coachMaterialsSubtitle
                }
                style={styles.sectionCard}
              >
                {coachMaterialsLoading ? (
                  <View style={styles.stateBlock}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={styles.stateBlockText}>
                      {PLAYER_PROFILE_COPY.materialsLoading}
                    </Text>
                  </View>
                ) : coachMaterialsError ? (
                  <View>
                    <Text style={styles.materialsErrorText}>
                      {coachMaterialsError}
                    </Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.btn,
                        pressed && { opacity: PRESSED_OPACITY },
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        void loadCoachMaterials();
                      }}
                    >
                      <Text style={styles.btnText}>Повторить</Text>
                    </Pressable>
                  </View>
                ) : coachMaterials && coachMaterialsHasContent(coachMaterials) ? (
                  <View>
                    {latestCoachReport ? (
                      <Pressable
                        onPress={() => {
                          triggerHaptic();
                          if (id && typeof id === "string") {
                            router.push(
                              `/player/${id}/coach-materials/report/${encodeURIComponent(latestCoachReport.id)}`
                            );
                          }
                        }}
                        style={({ pressed }) => [
                          styles.materialsPreviewShell,
                          pressed && { opacity: PRESSED_OPACITY },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Открыть полный отчёт тренера"
                      >
                        <View style={styles.materialsSubBlock}>
                          <View style={styles.materialsSectionHead}>
                            <Ionicons
                              name="document-text-outline"
                              size={18}
                              color="rgba(255,255,255,0.55)"
                              style={styles.materialsSectionIcon}
                            />
                            <View style={styles.materialsSectionHeadText}>
                              <Text style={styles.materialsSectionTitle}>
                                Отчёт о прогрессе
                              </Text>
                              <Text style={styles.materialsSectionMicro}>
                                Итоги и наблюдения тренера с последних занятий.
                              </Text>
                            </View>
                          </View>
                          {latestCoachReport.voiceNoteId ? (
                            <Text style={styles.materialsVoiceHint}>
                              {CM_VOICE_LABEL}
                            </Text>
                          ) : null}
                          <Text
                            style={styles.materialsItemTitle}
                            numberOfLines={2}
                          >
                            {coachHubReportTitle(latestCoachReport)}
                          </Text>
                          <Text
                            style={styles.materialsItemBody}
                            numberOfLines={4}
                          >
                            {coachHubReportPreview(latestCoachReport)}
                          </Text>
                          {latestCoachReport.createdAt ? (
                            <Text style={styles.materialsDate}>
                              Добавлено:{" "}
                              {formatSessionReportUpdatedAt(
                                latestCoachReport.createdAt
                              )}
                            </Text>
                          ) : null}
                          <Text style={styles.materialsOpenHint}>
                            {PLAYER_PROFILE_COPY.materialsOpenHint}
                          </Text>
                        </View>
                      </Pressable>
                    ) : null}

                    {coachActionsPreview.length > 0 ? (
                      <View
                        style={[
                          styles.materialsSubBlock,
                          latestCoachReport ? styles.materialsSubBlockFollow : null,
                        ]}
                      >
                        <View style={styles.materialsSectionHead}>
                          <Ionicons
                            name="list-outline"
                            size={18}
                            color="rgba(255,255,255,0.55)"
                            style={styles.materialsSectionIcon}
                          />
                          <View style={styles.materialsSectionHeadText}>
                            <Text style={styles.materialsSectionTitle}>
                              Что сделать дальше
                            </Text>
                            <Text style={styles.materialsSectionMicro}>
                              Задачи и фокус — что повторить дома и на льду.
                            </Text>
                          </View>
                        </View>
                        {coachActionsPreview.map((a, idx) => (
                          <Pressable
                            key={a.id}
                            onPress={() => {
                              triggerHaptic();
                              if (id && typeof id === "string") {
                                router.push(
                                  `/player/${id}/coach-materials/action-item/${encodeURIComponent(a.id)}`
                                );
                              }
                            }}
                            style={({ pressed }) => [
                              styles.materialsPreviewShell,
                              idx > 0 ? styles.materialsPreviewStackGap : null,
                              pressed && { opacity: PRESSED_OPACITY },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Открыть задачу полностью"
                          >
                            {a.voiceNoteId ? (
                              <Text style={styles.materialsVoiceHint}>
                                {CM_VOICE_LABEL}
                              </Text>
                            ) : null}
                            <Text
                              style={styles.materialsItemTitle}
                              numberOfLines={2}
                            >
                              {coachHubActionTitle(a)}
                            </Text>
                            <Text
                              style={styles.materialsItemBody}
                              numberOfLines={3}
                            >
                              {coachHubActionPreview(a)}
                            </Text>
                            <Text style={styles.materialsMetaMuted}>
                              Статус: {formatActionItemStatusLabel(a.status)}
                            </Text>
                          </Pressable>
                        ))}
                        <Text style={styles.materialsOpenHint}>
                          {PLAYER_PROFILE_COPY.materialsOpenHint}
                        </Text>
                      </View>
                    ) : null}

                    {latestParentDraft ? (
                      <Pressable
                        onPress={() => {
                          triggerHaptic();
                          if (id && typeof id === "string") {
                            router.push(
                              `/player/${id}/coach-materials/parent-draft/${encodeURIComponent(latestParentDraft.id)}`
                            );
                          }
                        }}
                        style={({ pressed }) => [
                          styles.materialsPreviewShell,
                          pressed && { opacity: PRESSED_OPACITY },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Открыть черновик сообщения полностью"
                      >
                        <View
                          style={[
                            styles.materialsSubBlock,
                            latestCoachReport || coachActionsPreview.length > 0
                              ? styles.materialsSubBlockFollow
                              : null,
                          ]}
                        >
                          <View style={styles.materialsSectionHead}>
                            <Ionicons
                              name="chatbubble-ellipses-outline"
                              size={18}
                              color="rgba(255,255,255,0.55)"
                              style={styles.materialsSectionIcon}
                            />
                            <View style={styles.materialsSectionHeadText}>
                              <Text style={styles.materialsSectionTitle}>
                                Сообщение родителю
                              </Text>
                              <Text style={styles.materialsSectionMicro}>
                                Личный текст от тренера — отдельно от отчёта и задач.
                              </Text>
                            </View>
                          </View>
                          {latestParentDraft.voiceNoteId ? (
                            <Text style={styles.materialsVoiceHint}>
                              {CM_VOICE_LABEL}
                            </Text>
                          ) : null}
                          <Text
                            style={styles.materialsItemBody}
                            numberOfLines={5}
                          >
                            {coachHubDraftPreview(latestParentDraft)}
                          </Text>
                          {latestParentDraft.createdAt ? (
                            <Text style={styles.materialsDate}>
                              Добавлено:{" "}
                              {formatSessionReportUpdatedAt(
                                latestParentDraft.createdAt
                              )}
                            </Text>
                          ) : null}
                          <Text style={styles.materialsOpenHint}>
                            {PLAYER_PROFILE_COPY.materialsOpenHint}
                          </Text>
                        </View>
                      </Pressable>
                    ) : null}

                    <Pressable
                      onPress={() => {
                        triggerHaptic();
                        if (id && typeof id === "string") {
                          router.push(`/player/${id}/coach-materials`);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.materialsHubCta,
                        pressed && { opacity: PRESSED_OPACITY },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Смотреть все материалы тренера"
                    >
                      <Text style={styles.materialsHubCtaText}>
                        Смотреть все материалы
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={PARENT_FLAGSHIP.chevronMutedIcon}
                      />
                    </Pressable>

                    <Text style={styles.materialsFootHint}>
                      {PLAYER_PROFILE_COPY.materialsFootHint}
                    </Text>
                  </View>
                ) : null}
              </SectionCard>
            </Animated.View>
          ) : null}

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
          <Text style={styles.actionsEyebrow}>{PLAYER_PROFILE_COPY.actionsEyebrow}</Text>
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
            description="Задайте вопрос о развитии — получите совет под вашего игрока"
            onPress={() => {
              triggerHaptic();
              id && router.push(`/chat/${COACH_MARK_ID}?playerId=${encodeURIComponent(id)}`);
            }}
            variant="default"
          />

          <ActionLinkCard
            icon="folder-open-outline"
            title="Coach Mark Hub"
            description="Всё, что Coach Mark сохранил: заметки, планы, экспорт в календарь"
            onPress={() => {
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
              <Ionicons
                name="chevron-forward"
                size={20}
                color={PARENT_FLAGSHIP.chevronMutedIcon}
              />
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
              <Text style={styles.stateBlockText}>
                {PLAYER_PROFILE_COPY.aiAnalysisLoading}
              </Text>
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
        <SectionCard title="Ближайшее расписание" variant="primary" style={styles.sectionCard}>
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
        photo={
          player.avatarUrl?.trim()
            ? { uri: player.avatarUrl.trim() }
            : isDemo
              ? { uri: DEMO_PLAYER.image }
              : null
        }
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
  profileLoadingHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    letterSpacing: 0.15,
  },
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel2Border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel2Border,
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
  actionsBlock: {
    marginBottom: spacing.lg,
  },
  actionsEyebrow: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
    letterSpacing: 0.15,
  },
  chatCard: {
    marginBottom: spacing.xl,
  },
  chatCardInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLevel2,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel2Border,
  },
  chatCardPressed: { opacity: PRESSED_OPACITY },
  chatIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(46, 167, 255, 0.18)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
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
  materialsErrorText: {
    fontSize: 14,
    color: colors.errorText,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  materialsSubBlock: {
    marginBottom: 0,
  },
  materialsSubBlockFollow: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  materialsSectionHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  materialsSectionIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  materialsSectionHeadText: {
    flex: 1,
  },
  materialsSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.92)",
    lineHeight: 20,
  },
  materialsSectionMicro: {
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255, 255, 255, 0.48)",
    marginTop: 4,
  },
  materialsFootHint: {
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255, 255, 255, 0.42)",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  materialsPreviewShell: {
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    padding: spacing.md,
  },
  materialsPreviewStackGap: {
    marginTop: spacing.sm,
  },
  materialsHubCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  materialsHubCtaText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.88)",
    flex: 1,
  },
  materialsOpenHint: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.45)",
    marginTop: spacing.sm,
  },
  materialsVoiceHint: {
    fontSize: 11,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  materialsItemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.95)",
    lineHeight: 22,
    marginBottom: 4,
  },
  materialsItemBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.78)",
  },
  materialsDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.45)",
    marginTop: spacing.sm,
  },
  materialsMetaMuted: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.45)",
    marginTop: 4,
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
    marginBottom: spacing.xl,
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
  attendanceSummaryWrap: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  attendanceSummaryPrimary: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  attendanceSummarySecondary: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
  evalBlock: {
    gap: spacing.sm,
  },
  evalBlockCompact: {
    gap: spacing.xs,
  },
  evalLine: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  evalNote: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  evalNoteTightTop: {
    marginTop: 0,
  },
  evalEmpty: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  reportMain: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  reportUpdatedAt: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  evalSummaryCount: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.surfaceLevel1,
    borderColor: colors.surfaceLevel1Border,
    ...shadows.level1,
    marginBottom: spacing.lg,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel2Border,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
