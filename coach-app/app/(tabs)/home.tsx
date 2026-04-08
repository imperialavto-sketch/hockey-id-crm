import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PressableFeedback } from '@/components/ui/PressableFeedback';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { CoachHomePrioritiesBlock } from '@/components/dashboard/CoachHomePrioritiesBlock';
import { CoachMarkProBlock } from '@/components/dashboard/CoachMarkProBlock';
import { CoachMarkDigestBlock } from '@/components/dashboard/CoachMarkDigestBlock';
import { StaggerFadeIn } from '@/components/dashboard/StaggerFadeIn';
import { getCoachTeams, type CoachTeamItem } from '@/services/coachTeamsService';
import { getCoachMessages } from '@/services/coachMessagesService';
import type { ConversationCardData } from '@/components/messages/ConversationCard';
import { isAuthRequiredError } from '@/lib/coachAuth';
import { theme } from '@/constants/theme';
import {
  getResumeSessionSummary,
  type ResumeSessionSummary,
} from '@/lib/resumeSessionHelpers';
import { resetSessionDraftOnly } from '@/lib/coachInputStorage';
import { getCreatedReports } from '@/services/createdReportsService';
import { getCreatedActions } from '@/services/createdActionsService';
import { getParentDrafts } from '@/lib/parentDraftHelpers';
import { getVoiceNotes } from '@/services/voiceNotesService';
import { getWeeklyReadyReports } from '@/lib/weeklyReportHelpers';
import { COACH_DASHBOARD_COPY } from '@/lib/coachDashboardUi';
import { getActiveLiveTrainingSession, LIVE_TRAINING_START_ROUTE } from '@/services/liveTrainingService';
import type { LiveTrainingSession } from '@/types/liveTraining';

const RECENT_MESSAGES_LIMIT = 5;

type HomeHubState = {
  loading: boolean;
  resume: ResumeSessionSummary | null;
  materialsTotal: number;
  voiceNotesCount: number;
  materialsPartial: boolean;
  weeklyReportsCount: number;
  weeklyReportsUnavailable: boolean;
};

const INITIAL_HUB: HomeHubState = {
  loading: true,
  resume: null,
  materialsTotal: 0,
  voiceNotesCount: 0,
  materialsPartial: false,
  weeklyReportsCount: 0,
  weeklyReportsUnavailable: false,
};

async function loadHomeHubSnapshot(): Promise<Omit<HomeHubState, 'loading'>> {
  const resume = await getResumeSessionSummary();

  const settled = await Promise.allSettled([
    getCreatedReports(),
    getCreatedActions(),
    getParentDrafts(),
    getVoiceNotes(),
  ]);
  const [r, a, d, v] = settled;

  let materialsTotal = 0;
  let voiceNotesCount = 0;
  let fulfilled = 0;

  if (r.status === 'fulfilled' && r.value.ok) {
    fulfilled += 1;
    const n = r.value.data.length;
    materialsTotal += n;
  }
  if (a.status === 'fulfilled' && a.value.ok) {
    fulfilled += 1;
    const n = a.value.data.length;
    materialsTotal += n;
  }
  if (d.status === 'fulfilled') {
    fulfilled += 1;
    materialsTotal += d.value.length;
  }
  if (v.status === 'fulfilled' && v.value.ok) {
    fulfilled += 1;
    const n = v.value.data.length;
    voiceNotesCount = n;
    materialsTotal += n;
  }

  const materialsPartial = fulfilled < 4;

  let weeklyReportsCount = 0;
  let weeklyReportsUnavailable = false;
  try {
    weeklyReportsCount = (await getWeeklyReadyReports()).length;
  } catch {
    weeklyReportsUnavailable = true;
  }

  return {
    resume,
    materialsTotal,
    voiceNotesCount,
    materialsPartial,
    weeklyReportsCount,
    weeklyReportsUnavailable,
  };
}

function formatContextDate() {
  const d = new Date();
  return d.toLocaleDateString('ru-RU', { weekday: 'long', month: 'short', day: 'numeric' });
}

function buildStatusPrimaryLine(
  hub: HomeHubState,
  live: LiveTrainingSession | null,
  opts?: { liveLoading?: boolean; liveError?: string | null }
): string {
  if (hub.loading) return COACH_DASHBOARD_COPY.loadingHubStatus;
  if (opts?.liveLoading) {
    return 'Проверяем активную тренировку…';
  }
  if (opts?.liveError) {
    return 'Не удалось проверить активную тренировку';
  }
  if (live?.status === 'live') {
    return 'Живая тренировка активна — вернитесь на экран записи, когда будете на площадке.';
  }
  if (live?.status === 'review') {
    return 'Живая тренировка ждёт проверки наблюдений.';
  }
  if (live?.status === 'confirmed') {
    return 'Наблюдения подтверждены — завершите отчёт по сессии.';
  }
  if (hub.resume?.source === 'coachInputDraft') {
    return 'Есть незавершённая классическая запись наблюдений — её можно продолжить отдельно.';
  }
  return 'Активной живой тренировки нет — начните, когда будете на площадке.';
}

function buildStatusSecondaryLine(
  hub: HomeHubState,
  messagesNeedsReactionCount = 0,
  messagesAwaitingReplyCount = 0,
  live: LiveTrainingSession | null = null,
  opts?: { liveLoading?: boolean; liveError?: string | null }
): string {
  if (hub.loading) return '';
  if (opts?.liveLoading) return '';
  if (opts?.liveError) {
    return opts.liveError;
  }
  const parts: string[] = [];
  if (hub.materialsPartial) {
    parts.push('часть материалов не подтянулась');
  }
  if (live?.status === 'live') {
    parts.push('таймер и события — на экране живой тренировки');
  } else if (live?.status === 'review') {
    parts.push('подтвердите наблюдения, чтобы зафиксировать сессию');
  } else if (live?.status === 'confirmed') {
    parts.push('перейдите к экрану завершения, чтобы закрыть сессию');
  } else if (hub.resume?.source === 'coachInputDraft') {
    parts.push('классический черновик можно продолжить или сбросить');
  }
  if (messagesNeedsReactionCount > 0) {
    parts.push('в сообщениях ждут ваш ответ');
  } else if (messagesAwaitingReplyCount > 0) {
    parts.push('ждём ответ родителя');
  }
  if (parts.length === 0) {
    return COACH_DASHBOARD_COPY.statusSecondaryFallback;
  }
  return parts.join(' · ');
}

function HomeStatusSkeleton() {
  const pulse = useSharedValue(0.35);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(0.75, { duration: 650 }), withTiming(0.35, { duration: 650 })),
      -1,
      true
    );
  }, [pulse]);
  const barStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={styles.statusSkeletonWrap}>
      <Animated.View style={[styles.statusSkeletonBar, styles.statusSkeletonBarLong, barStyle]} />
      <Animated.View style={[styles.statusSkeletonBar, styles.statusSkeletonBarMid, barStyle]} />
      <Animated.View style={[styles.statusSkeletonBar, styles.statusSkeletonBarShort, barStyle]} />
    </View>
  );
}

function HomeReportsAndMaterialsCard({
  hub,
  router,
}: {
  hub: HomeHubState;
  router: ReturnType<typeof useRouter>;
}) {
  if (hub.loading) {
    return (
      <SectionCard elevated style={styles.workLinksCard}>
        <Text style={styles.workLinksKicker}>Отчёты и материалы</Text>
        <HomeStatusSkeleton />
      </SectionCard>
    );
  }

  const reportsMeta = hub.weeklyReportsUnavailable
    ? 'список недоступен'
    : hub.weeklyReportsCount > 0
      ? `${hub.weeklyReportsCount} готовых`
      : 'пока нет готовых';

  const materialsMeta = hub.materialsPartial
    ? 'часть разделов не подтянулась'
    : hub.materialsTotal > 0
      ? `${hub.materialsTotal} ${hub.materialsTotal === 1 ? 'элемент' : hub.materialsTotal < 5 ? 'элемента' : 'элементов'}`
      : 'пока пусто';

  const voiceHistoryMeta =
    hub.voiceNotesCount > 0
      ? `${hub.voiceNotesCount} ${hub.voiceNotesCount === 1 ? 'запись' : hub.voiceNotesCount < 5 ? 'записи' : 'записей'}`
      : 'пока пусто';

  return (
    <SectionCard elevated style={styles.workLinksCard}>
      <Text style={styles.workLinksKicker}>Отчёты и материалы</Text>
      <Text style={styles.workLinksIntro}>{COACH_DASHBOARD_COPY.workLinksIntro}</Text>

      <PressableFeedback
        hapticOnPress
        style={styles.workLinkRow}
        onPress={() => router.push('/reports' as Parameters<typeof router.push>[0])}
      >
        <View style={styles.workLinkTextCol}>
          <Text style={styles.workLinkTitle}>Отчёты недели</Text>
          <Text style={styles.workLinkMeta}>{reportsMeta}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </PressableFeedback>

      <PressableFeedback
        hapticOnPress
        style={[styles.workLinkRow, styles.workLinkRowBorder]}
        onPress={() => router.push('/created' as Parameters<typeof router.push>[0])}
      >
        <View style={styles.workLinkTextCol}>
          <Text style={styles.workLinkTitle}>Материалы</Text>
          <Text style={styles.workLinkMeta}>{materialsMeta}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </PressableFeedback>

      <PressableFeedback
        hapticOnPress
        style={[styles.workLinkRow, styles.workLinkRowBorder]}
        onPress={() => router.push('/voice-notes' as Parameters<typeof router.push>[0])}
      >
        <View style={styles.workLinkTextCol}>
          <Text style={styles.workLinkTitle}>Личные голосовые заметки</Text>
          <Text style={styles.workLinkMeta}>{voiceHistoryMeta}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </PressableFeedback>
    </SectionCard>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const [hub, setHub] = useState<HomeHubState>(INITIAL_HUB);
  const [teams, setTeams] = useState<CoachTeamItem[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [recentMessages, setRecentMessages] = useState<ConversationCardData[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [hubLoadedOnce, setHubLoadedOnce] = useState(false);
  const [teamsLoadedOnce, setTeamsLoadedOnce] = useState(false);
  const [messagesLoadedOnce, setMessagesLoadedOnce] = useState(false);
  const [messagesNeedsReactionCount, setMessagesNeedsReactionCount] = useState(0);
  const [messagesAwaitingReplyCount, setMessagesAwaitingReplyCount] = useState(0);
  const [liveTraining, setLiveTraining] = useState<LiveTrainingSession | null>(null);
  const [liveTrainingLoadPending, setLiveTrainingLoadPending] = useState(true);
  const [liveTrainingLoadError, setLiveTrainingLoadError] = useState<string | null>(null);

  const runActiveLiveTrainingFetch = useCallback((isCancelled: () => boolean) => {
    setLiveTrainingLoadPending(true);
    setLiveTrainingLoadError(null);
    getActiveLiveTrainingSession()
      .then((live) => {
        if (isCancelled()) return;
        setLiveTraining(live);
        setLiveTrainingLoadError(null);
      })
      .catch((err) => {
        if (isCancelled()) return;
        setLiveTraining(null);
        setLiveTrainingLoadError(
          isAuthRequiredError(err)
            ? 'Требуется авторизация'
            : err instanceof Error
              ? err.message
              : 'Не удалось проверить активную тренировку'
        );
      })
      .finally(() => {
        if (!isCancelled()) setLiveTrainingLoadPending(false);
      });
  }, []);

  const refetchActiveLiveTraining = useCallback(() => {
    runActiveLiveTrainingFetch(() => false);
  }, [runActiveLiveTrainingFetch]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setHub((s) => ({ ...s, loading: hubLoadedOnce ? s.loading : true }));
      loadHomeHubSnapshot()
        .then((snap) => {
          if (cancelled) return;
          setHub({ loading: false, ...snap });
          setHubLoadedOnce(true);
        })
        .catch(() => {
          if (cancelled) return;
          setHub({
            ...INITIAL_HUB,
            loading: false,
            materialsPartial: true,
            weeklyReportsUnavailable: true,
          });
          setHubLoadedOnce(true);
        });
      runActiveLiveTrainingFetch(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [hubLoadedOnce, runActiveLiveTrainingFetch])
  );

  const handlePrimaryLiveTraining = useCallback(() => {
    if (liveTraining?.status === 'live') {
      router.push(`/live-training/${liveTraining.id}/live` as Parameters<typeof router.push>[0]);
      return;
    }
    if (liveTraining?.status === 'review') {
      router.push(`/live-training/${liveTraining.id}/review` as Parameters<typeof router.push>[0]);
      return;
    }
    if (liveTraining?.status === 'confirmed') {
      router.push(`/live-training/${liveTraining.id}/complete` as Parameters<typeof router.push>[0]);
      return;
    }
    router.push(LIVE_TRAINING_START_ROUTE as Parameters<typeof router.push>[0]);
  }, [router, liveTraining]);

  const handleClassicCoachInput = useCallback(() => {
    router.push(LIVE_TRAINING_START_ROUTE as Parameters<typeof router.push>[0]);
  }, [router]);

  const handleResetSessionDraft = useCallback(() => {
    Alert.alert(
      'Сбросить тренировку',
      'Незавершённая тренировка будет очищена. Несохранённые наблюдения пропадут. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: async () => {
            await resetSessionDraftOnly();
            setHub((s) => ({ ...s, resume: null }));
          },
        },
      ]
    );
  }, []);

  const heroSubtitle = hub.loading
    ? undefined
    : liveTrainingLoadPending
      ? 'Загружаем состояние живой тренировки…'
      : liveTrainingLoadError
        ? 'Проверка активной сессии не удалась — нажмите «Повторить» в блоке «Сейчас» или начните тренировку.'
        : liveTraining?.status === 'live' ||
            liveTraining?.status === 'review' ||
            liveTraining?.status === 'confirmed'
          ? 'Живая тренировка активна — это основной сценарий. Вернитесь к экрану записи или проверки.'
          : hub.resume?.source === 'coachInputDraft'
            ? COACH_DASHBOARD_COPY.heroSubtitleResume
            : COACH_DASHBOARD_COPY.heroSubtitleDefault;

  useFocusEffect(
    useCallback(() => {
      setTeamsLoading((prev) => (teamsLoadedOnce ? prev : true));
      setTeamsError(null);
      getCoachTeams()
        .then((data) => {
          setTeams(data);
          setTeamsError(null);
          setTeamsLoadedOnce(true);
        })
        .catch((err) => {
          setTeams([]);
          setTeamsError(isAuthRequiredError(err) ? 'Требуется авторизация' : (err instanceof Error ? err.message : 'Не удалось загрузить команды'));
        })
        .finally(() => setTeamsLoading(false));
    }, [teamsLoadedOnce])
  );

  useFocusEffect(
    useCallback(() => {
      setMessagesLoading((prev) => (messagesLoadedOnce ? prev : true));
      setMessagesError(null);
      getCoachMessages()
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setRecentMessages(list.slice(0, RECENT_MESSAGES_LIMIT));
          setMessagesNeedsReactionCount(
            list.filter((c) => c.needsCoachReaction === true).length
          );
          setMessagesAwaitingReplyCount(
            list.filter((c) => c.awaitingParentReply === true).length
          );
          setMessagesError(null);
          setMessagesLoadedOnce(true);
        })
        .catch((err) => {
          setRecentMessages([]);
          setMessagesNeedsReactionCount(0);
          setMessagesAwaitingReplyCount(0);
          setMessagesError(isAuthRequiredError(err) ? 'Требуется авторизация' : 'Не удалось загрузить');
        })
        .finally(() => setMessagesLoading(false));
    }, [messagesLoadedOnce])
  );

  const dateLabel = formatContextDate();
  const teamsSummary = teamsLoading
    ? '— команд · — игроков'
    : teamsError
      ? 'Ошибка загрузки'
      : `${teams.length} команд · ${teams.reduce((s, t) => s + t.playerCount, 0)} игроков`;

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn delay={0} preset="snappy">
        <View style={styles.heroWrap}>
          <DashboardHero dateLabel={dateLabel} teamsSummary={teamsSummary} subtitle={heroSubtitle} />
        </View>
      </StaggerFadeIn>

      <StaggerFadeIn delay={8} preset="snappy">
        <SectionCard elevated style={styles.statusCard}>
          {hub.loading ? (
            <HomeStatusSkeleton />
          ) : (
            <StaggerFadeIn delay={0} preset="snappy">
              <Text style={styles.statusEyebrow}>Сейчас</Text>
              <View style={styles.statusTop}>
                <Text style={styles.statusPrimary}>
                  {buildStatusPrimaryLine(hub, liveTraining, {
                    liveLoading: liveTrainingLoadPending && !hub.loading,
                    liveError: !liveTrainingLoadPending ? liveTrainingLoadError : null,
                  })}
                </Text>
                {hub.resume ||
                liveTraining?.status === 'live' ||
                liveTraining?.status === 'review' ||
                liveTraining?.status === 'confirmed' ? (
                  <View style={styles.statusLiveDot} />
                ) : null}
              </View>
              <Text style={styles.statusSecondary}>
                {buildStatusSecondaryLine(
                  hub,
                  messagesNeedsReactionCount,
                  messagesAwaitingReplyCount,
                  liveTraining,
                  {
                    liveLoading: liveTrainingLoadPending && !hub.loading,
                    liveError: !liveTrainingLoadPending ? liveTrainingLoadError : null,
                  }
                )}
              </Text>
              {(hub.materialsPartial || hub.weeklyReportsUnavailable) ? (
                <View style={styles.softNotice}>
                  <Text style={styles.softNoticeText}>{COACH_DASHBOARD_COPY.softPartialNotice}</Text>
                </View>
              ) : null}
              {liveTrainingLoadError && !hub.loading ? (
                <View style={styles.liveTrainingErrorBanner}>
                  <Text style={styles.liveTrainingErrorText}>{liveTrainingLoadError}</Text>
                  <PressableFeedback style={styles.liveTrainingRetry} onPress={refetchActiveLiveTraining}>
                    <Text style={styles.liveTrainingRetryText}>Повторить проверку</Text>
                  </PressableFeedback>
                </View>
              ) : null}
              {!hub.loading ? (
                <PrimaryButton
                  animatedPress
                  title={
                    liveTraining?.status === 'live'
                      ? 'Вернуться к тренировке'
                      : liveTraining?.status === 'review'
                        ? 'Перейти к проверке'
                        : liveTraining?.status === 'confirmed'
                          ? 'Завершить отчёт'
                          : 'Начать тренировку'
                  }
                  onPress={handlePrimaryLiveTraining}
                  style={styles.trainingPrimaryCta}
                />
              ) : null}
              {hub.resume?.source === 'coachInputDraft' &&
              liveTraining?.status !== 'live' &&
              liveTraining?.status !== 'review' &&
              liveTraining?.status !== 'confirmed' ? (
                <PressableFeedback style={styles.classicResumeLink} onPress={handleClassicCoachInput}>
                  <Text style={styles.classicResumeLinkText}>Продолжить классическую запись</Text>
                </PressableFeedback>
              ) : null}
              {hub.resume?.source === 'coachInputDraft' ? (
                <PressableFeedback style={styles.resetLink} onPress={handleResetSessionDraft}>
                  <Text style={styles.resetLinkText}>Сбросить черновик классической тренировки</Text>
                </PressableFeedback>
              ) : null}
            </StaggerFadeIn>
          )}
        </SectionCard>
      </StaggerFadeIn>

      <StaggerFadeIn delay={14} preset="snappy">
        <HomeReportsAndMaterialsCard hub={hub} router={router} />
      </StaggerFadeIn>

      <StaggerFadeIn delay={22} preset="snappy">
        <Text style={styles.secondaryHeading}>Дальше на главной</Text>
      </StaggerFadeIn>

      <StaggerFadeIn delay={42}>
        <DashboardSection title="Приоритеты" compact>
          <CoachHomePrioritiesBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={48}>
        <DashboardSection title="Coach Mark" compact>
          <CoachMarkProBlock />
          <View style={styles.coachMarkBetweenBlocks} />
          <CoachMarkDigestBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={72}>
        <DashboardSection title="Сессия и посещаемость" compact>
          <SectionCard elevated>
            <Text style={styles.practiceTime}>
              {teams[0]?.nextSession ?? '—'}
            </Text>
            <Text style={styles.practiceVenue}>
              {teams[0] ? `${teams[0].venue ?? '—'} · ${teams[0].name}` : '—'}
            </Text>
            <Text style={styles.practiceMeta}>
              {teams.length > 0
                ? `${teams[0]?.expected ?? '—'} ожидается · ${teams[0]?.confirmed ?? '—'} подтверждено`
                : '—'}
            </Text>
            <View style={styles.sessionSectionDivider} />
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {teams.reduce((s, t) => s + t.expected, 0) || '—'}
                </Text>
                <Text style={styles.statLabel}>Ожидается</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, styles.statValueSuccess]}>
                  {teams.reduce((s, t) => s + t.confirmed, 0) || '—'}
                </Text>
                <Text style={styles.statLabel}>Подтверждено</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, styles.statValueMuted]}>
                  {teams.length > 0
                    ? Math.max(
                        0,
                        teams.reduce((s, t) => s + t.expected, 0) -
                          teams.reduce((s, t) => s + t.confirmed, 0)
                      )
                    : '—'}
                </Text>
                <Text style={styles.statLabel}>Ожидают</Text>
              </View>
            </View>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={120}>
        <DashboardSection title="Мои команды">
          <SectionCard elevated>
            {teamsLoading ? (
              <View style={styles.teamsLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>{COACH_DASHBOARD_COPY.loadingBlock}</Text>
              </View>
            ) : teamsError ? (
              <View style={styles.errorBlock}>
                <Text style={styles.errorText}>{teamsError}</Text>
                {teamsError !== 'Требуется авторизация' ? (
                  <Text style={styles.errorHint}>{COACH_DASHBOARD_COPY.networkRetryHint}</Text>
                ) : null}
                <PrimaryButton
                  title={COACH_DASHBOARD_COPY.retryCta}
                  variant="outline"
                  onPress={() => {
                    setTeamsLoading(true);
                    setTeamsError(null);
                    getCoachTeams()
                      .then((data) => {
                        setTeams(data);
                        setTeamsError(null);
                      })
                      .catch((err) => {
                        setTeams([]);
                        setTeamsError(isAuthRequiredError(err) ? 'Требуется авторизация' : (err instanceof Error ? err.message : 'Не удалось загрузить команды'));
                      })
                      .finally(() => setTeamsLoading(false));
                  }}
                  style={styles.retryBtn}
                />
              </View>
            ) : teams.length === 0 ? (
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyText}>Нет команд</Text>
                <Text style={styles.emptyHint}>{COACH_DASHBOARD_COPY.teamsEmptyHint}</Text>
              </View>
            ) : (
              <>
                {teams.map((team, i) => (
                  <Pressable
                    key={team.id}
                    style={({ pressed }) => [
                      styles.teamRow,
                      i > 0 && styles.teamRowBorder,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => router.push(`/team/${team.id}`)}
                  >
                    <Text style={styles.teamName}>{team.name}</Text>
                    <View style={styles.teamRowRight}>
                      <Text style={styles.teamCount}>{team.playerCount} игроков</Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                    </View>
                  </Pressable>
                ))}
                <PrimaryButton
                  title="Управление ростером"
                  variant="outline"
                  onPress={() => router.push('/(tabs)/teams')}
                  style={styles.teamCta}
                />
              </>
            )}
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={132}>
        <DashboardSection title="Сообщения">
          <SectionCard elevated>
            {messagesLoading ? (
              <View style={styles.messagesLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>{COACH_DASHBOARD_COPY.loadingBlock}</Text>
              </View>
            ) : messagesError ? (
              <View style={styles.messagesErrorBlock}>
                <Text style={styles.messagesErrorText}>{messagesError}</Text>
                {messagesError !== 'Требуется авторизация' ? (
                  <Text style={styles.errorHint}>{COACH_DASHBOARD_COPY.networkRetryHint}</Text>
                ) : null}
                <PrimaryButton
                  title={COACH_DASHBOARD_COPY.retryCta}
                  variant="outline"
                  onPress={() => {
                    setMessagesLoading(true);
                    setMessagesError(null);
                    getCoachMessages()
                      .then((data) => {
                        const list = Array.isArray(data) ? data : [];
                        setRecentMessages(list.slice(0, RECENT_MESSAGES_LIMIT));
                        setMessagesNeedsReactionCount(
                          list.filter((c) => c.needsCoachReaction === true).length
                        );
                        setMessagesAwaitingReplyCount(
                          list.filter((c) => c.awaitingParentReply === true).length
                        );
                        setMessagesError(null);
                      })
                      .catch((err) => {
                        setRecentMessages([]);
                        setMessagesNeedsReactionCount(0);
                        setMessagesAwaitingReplyCount(0);
                        setMessagesError(isAuthRequiredError(err) ? 'Требуется авторизация' : 'Не удалось загрузить');
                      })
                      .finally(() => setMessagesLoading(false));
                  }}
                  style={styles.retryBtn}
                />
              </View>
            ) : recentMessages.length === 0 ? (
              <View style={styles.messagesEmptyBlock}>
                <Text style={styles.emptyText}>Пока нет сообщений</Text>
                <Text style={styles.emptyHint}>{COACH_DASHBOARD_COPY.messagesEmptyHint}</Text>
              </View>
            ) : (
              recentMessages.map((msg, i) => (
                <Pressable
                  key={msg.id}
                  style={({ pressed }) => [
                    styles.messageRow,
                    i > 0 && styles.messageRowBorder,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => router.push(`/conversation/${msg.id}` as const)}
                >
                  <View style={styles.messageRowInner}>
                    <View style={styles.messageContent}>
                      <Text style={[styles.messageFrom, (msg.unreadCount ?? 0) > 0 && styles.messageFromUnread]}>
                        {msg.name ?? 'Диалог'}
                      </Text>
                      <Text style={styles.messagePreview} numberOfLines={1}>
                        {msg.preview ?? '—'}
                      </Text>
                      <Text style={styles.messageTime}>{msg.time || '—'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                  </View>
                </Pressable>
              ))
            )}
            {!messagesLoading && (
              <PrimaryButton
                title="Все сообщения"
                variant="outline"
                onPress={() =>
                  router.push('/(tabs)/messages' as Parameters<typeof router.push>[0])
                }
                style={styles.messageCta}
              />
            )}
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  heroWrap: {
    marginBottom: theme.spacing.md,
  },
  coachMarkBetweenBlocks: {
    height: theme.spacing.sm,
  },
  sessionSectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  workLinksCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  workLinksKicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  workLinksIntro: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  workLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  workLinkRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  workLinkTextCol: {
    flex: 1,
    minWidth: 0,
  },
  workLinkTitle: {
    ...theme.typography.subtitle,
    fontSize: 15,
    color: theme.colors.text,
  },
  workLinkMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  trainingPrimaryCta: {
    marginTop: theme.spacing.md,
  },
  statusCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  statusEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  softNotice: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  softNoticeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  liveTrainingErrorBanner: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.xs,
  },
  liveTrainingErrorText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  liveTrainingRetry: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
  },
  liveTrainingRetryText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  statusSkeletonWrap: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  statusSkeletonBar: {
    height: 12,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.border,
  },
  statusSkeletonBarLong: {
    width: '92%',
  },
  statusSkeletonBarMid: {
    width: '78%',
  },
  statusSkeletonBarShort: {
    width: '55%',
  },
  statusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  statusPrimary: {
    ...theme.typography.body,
    flex: 1,
    color: theme.colors.text,
    fontWeight: '600',
    lineHeight: 22,
  },
  statusLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  statusSecondary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  classicResumeLink: {
    marginTop: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  classicResumeLinkText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  resetLink: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  resetLinkText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textDecorationLine: 'underline',
  },
  secondaryHeading: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  teamsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  errorBlock: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  errorHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  retryBtn: {
    alignSelf: 'flex-start',
  },
  emptyBlock: {
    paddingVertical: theme.spacing.md,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  emptyHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  practiceTime: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  practiceVenue: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  practiceMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statValueSuccess: {
    color: theme.colors.primary,
  },
  statValueMuted: {
    color: theme.colors.textMuted,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  teamRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  teamRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  teamName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  teamCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  teamCta: {
    marginTop: theme.spacing.sm,
  },
  messagesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  messagesErrorBlock: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  messagesErrorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  messagesEmptyBlock: {
    paddingVertical: theme.spacing.md,
  },
  messageRow: {
    paddingVertical: theme.spacing.sm,
  },
  messageRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  messageRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  messageContent: {
    flex: 1,
    gap: 2,
  },
  messageFrom: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  messageFromUnread: {
    fontWeight: '600',
  },
  messagePreview: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  messageTime: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  messageCta: {
    marginTop: theme.spacing.sm,
  },
  bottomSpacer: {
    height: theme.spacing.xxl,
  },
});
