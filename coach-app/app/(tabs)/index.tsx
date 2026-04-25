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
import { WeeklyReportsBlock } from '@/components/dashboard/WeeklyReportsBlock';
import { CoachActionBlock } from '@/components/dashboard/CoachActionBlock';
import { ParentDraftsBlock } from '@/components/dashboard/ParentDraftsBlock';
import { StaggerFadeIn } from '@/components/dashboard/StaggerFadeIn';
import { getCoachTeams, type CoachTeamItem } from '@/services/coachTeamsService';
import { getCoachMessages } from '@/services/coachMessagesService';
import type { ConversationCardData } from '@/components/messages/ConversationCard';
import { isAuthRequiredError } from '@/lib/coachAuth';
import { theme } from '@/constants/theme';
import {
  getResumeSessionSummary,
  COACH_INPUT_ROUTE,
  isActiveLiveTrainingResumeSource,
  type ResumeSessionSummary,
} from '@/lib/resumeSessionHelpers';
import { getActiveLiveTrainingSession, LIVE_TRAINING_START_ROUTE } from '@/services/liveTrainingService';
import type { LiveTrainingSession } from '@/types/liveTraining';
import { resetSessionDraftOnly } from '@/lib/coachInputStorage';
import { getCreatedReports } from '@/services/createdReportsService';
import { getCreatedActions } from '@/services/createdActionsService';
import { getParentDrafts } from '@/lib/parentDraftHelpers';
import { getVoiceNotes } from '@/services/voiceNotesService';
import { getCoachActionItems } from '@/lib/coachActionHelpers';
import { getWeeklyReadyReports } from '@/lib/weeklyReportHelpers';
import { VOICE_NOTE_ROUTE } from '@/lib/voiceMvp';
import { COACH_DASHBOARD_COPY } from '@/lib/coachDashboardUi';

const RECENT_MESSAGES_LIMIT = 5;

type HomeHubState = {
  loading: boolean;
  resume: ResumeSessionSummary | null;
  materialsTotal: number;
  draftsCount: number;
  createdReportsCount: number;
  createdActionsCount: number;
  voiceNotesCount: number;
  materialsPartial: boolean;
  attentionCount: number;
  attentionUnavailable: boolean;
  weeklyReportsCount: number;
  weeklyReportsUnavailable: boolean;
};

const INITIAL_HUB: HomeHubState = {
  loading: true,
  resume: null,
  materialsTotal: 0,
  draftsCount: 0,
  createdReportsCount: 0,
  createdActionsCount: 0,
  voiceNotesCount: 0,
  materialsPartial: false,
  attentionCount: 0,
  attentionUnavailable: false,
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
  let draftsCount = 0;
  let createdReportsCount = 0;
  let createdActionsCount = 0;
  let voiceNotesCount = 0;
  let fulfilled = 0;

  if (r.status === 'fulfilled' && r.value.ok) {
    fulfilled += 1;
    const n = r.value.data.length;
    createdReportsCount = n;
    materialsTotal += n;
  }
  if (a.status === 'fulfilled' && a.value.ok) {
    fulfilled += 1;
    const n = a.value.data.length;
    createdActionsCount = n;
    materialsTotal += n;
  }
  if (d.status === 'fulfilled') {
    fulfilled += 1;
    draftsCount = d.value.length;
    materialsTotal += d.value.length;
  }
  if (v.status === 'fulfilled' && v.value.ok) {
    fulfilled += 1;
    const n = v.value.data.length;
    voiceNotesCount = n;
    materialsTotal += n;
  }

  const materialsPartial = fulfilled < 4;

  const [attentionResult, weeklyResult] = await Promise.allSettled([
    getCoachActionItems(),
    getWeeklyReadyReports(),
  ]);

  let attentionCount = 0;
  let attentionUnavailable = false;
  if (attentionResult.status === 'fulfilled') {
    attentionCount = attentionResult.value.length;
  } else {
    attentionUnavailable = true;
  }

  let weeklyReportsCount = 0;
  let weeklyReportsUnavailable = false;
  if (weeklyResult.status === 'fulfilled') {
    weeklyReportsCount = weeklyResult.value.length;
  } else {
    weeklyReportsUnavailable = true;
  }

  return {
    resume,
    materialsTotal,
    draftsCount,
    createdReportsCount,
    createdActionsCount,
    voiceNotesCount,
    materialsPartial,
    attentionCount,
    attentionUnavailable,
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
    return 'Есть незавершённая локальная запись (legacy) — отдельно от Arena live-training.';
  }
  if (isActiveLiveTrainingResumeSource(hub.resume?.source)) {
    return 'В legacy API есть активная сессия — coach-input, если нужно продолжить этот контур.';
  }
  return 'Активной живой тренировки нет — начните Arena / live-training, когда будете на площадке.';
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
    parts.push('локальный legacy-черновик можно продолжить или сбросить');
  } else if (isActiveLiveTrainingResumeSource(hub.resume?.source)) {
    parts.push('открыть coach-input для продолжения legacy-сессии');
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

type SpotlightAction = { title: string; route: string };

function buildSpotlightActions(
  hub: HomeHubState,
  messagesNeedsReactionCount: number
): SpotlightAction[] {
  const out: SpotlightAction[] = [];
  if (messagesNeedsReactionCount > 0) {
    out.push({ title: 'Сообщения', route: '/messages' });
  }
  if (!hub.loading && hub.draftsCount > 0) {
    out.push({ title: 'Черновики', route: '/parent-drafts' });
  }
  if (!hub.loading && !hub.attentionUnavailable && hub.attentionCount > 0) {
    out.push({ title: 'Задачи', route: '/actions' });
  }
  if (!hub.loading && !hub.weeklyReportsUnavailable && hub.weeklyReportsCount > 0) {
    out.push({ title: 'Отчёты', route: '/reports' });
  }
  return out.slice(0, 3);
}

function buildSpotlightCopy(
  hub: HomeHubState,
  messagesNeedsReactionCount = 0,
  messagesAwaitingReplyCount = 0
): { title: string; body: string; emphasized: boolean } {
  if (hub.loading) {
    return {
      title: 'Сейчас важно',
      body: COACH_DASHBOARD_COPY.spotlightLoadingBody,
      emphasized: false,
    };
  }
  if (hub.draftsCount > 0) {
    return {
      title: 'Сейчас важно',
      body: 'Есть черновики для родителей — просмотрите формулировки перед отправкой.',
      emphasized: true,
    };
  }
  if (!hub.attentionUnavailable && hub.attentionCount > 0) {
    return {
      title: 'Сейчас важно',
      body: 'Есть игроки, которым стоит уделить внимание на ближайшей тренировке.',
      emphasized: true,
    };
  }
  if (messagesNeedsReactionCount > 0) {
    return {
      title: 'Сообщения',
      body: 'Родители уже ответили — откройте сообщения и продолжите диалог. При необходимости задачу по игроку можно зафиксировать после ответа.',
      emphasized: true,
    };
  }
  if (messagesAwaitingReplyCount > 0) {
    return {
      title: 'Сообщения',
      body: 'Есть диалоги без ответа родителей — загляните в раздел «Сообщения», когда будет удобно.',
      emphasized: false,
    };
  }
  if (hub.materialsTotal > 0) {
    return {
      title: 'Сейчас важно',
      body: 'Материалы уже собраны — загляните в хаб и выберите следующий шаг.',
      emphasized: false,
    };
  }
  if (hub.resume) {
    return {
      title: 'Сейчас важно',
      body:
        hub.resume.source === 'coachInputDraft'
          ? 'Есть локальный legacy-черновик coach-input — это не канон Arena. Для живой сессии используйте live-training.'
          : 'Есть активная legacy-сессия на сервере — при необходимости продолжите в coach-input; канон пост-сессии — live-training.',
      emphasized: false,
    };
  }
  return {
    title: 'Сейчас спокойно',
    body: 'Начните с голосовой заметки или живой тренировки Arena (live-training) — материалы появятся в хабе.',
    emphasized: false,
  };
}

type QuickTile = {
  id: string;
  label: string;
  route: string;
  variant: 'primary' | 'default';
  badge?: boolean;
};

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

function SummaryMetricChip({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={[styles.summaryChip, muted && styles.summaryChipMuted]}>
      <Text style={[styles.summaryChipValue, muted && styles.summaryChipValueMuted]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.summaryChipLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function HomeSummaryCard({
  hub,
  router,
  messagesUnreadTotal,
  messagesError,
}: {
  hub: HomeHubState;
  router: ReturnType<typeof useRouter>;
  messagesUnreadTotal: number;
  messagesError: string | null;
}) {
  if (hub.loading) {
    return (
      <SectionCard elevated style={styles.summaryCard}>
        <Text style={styles.summaryKicker}>Сводка</Text>
        <HomeStatusSkeleton />
      </SectionCard>
    );
  }

  const msgValue = messagesError ? '—' : messagesUnreadTotal > 0 ? `${messagesUnreadTotal} новых` : 'Нет новых';
  const taskValue = hub.attentionUnavailable ? '—' : String(hub.attentionCount);
  const repValue = hub.weeklyReportsUnavailable ? '—' : String(hub.weeklyReportsCount);

  return (
    <SectionCard elevated style={styles.summaryCard}>
      <Text style={styles.summaryKicker}>Сводка</Text>
        <Text style={styles.summaryHint} numberOfLines={2}>
        {COACH_DASHBOARD_COPY.summaryHint}
      </Text>
      <View style={styles.summaryGrid}>
        <PressableFeedback
          hapticOnPress
          style={styles.summaryCellHit}
          onPress={() => router.push('/messages' as Parameters<typeof router.push>[0])}
        >
          <SummaryMetricChip label="Сообщения" value={msgValue} muted={!!messagesError} />
        </PressableFeedback>
        <PressableFeedback
          hapticOnPress
          style={styles.summaryCellHit}
          onPress={() => router.push('/actions' as Parameters<typeof router.push>[0])}
        >
          <SummaryMetricChip label="Задачи" value={taskValue} muted={hub.attentionUnavailable} />
        </PressableFeedback>
        <PressableFeedback
          hapticOnPress
          style={styles.summaryCellHit}
          onPress={() => router.push('/reports' as Parameters<typeof router.push>[0])}
        >
          <SummaryMetricChip label="Отчёты недели" value={repValue} muted={hub.weeklyReportsUnavailable} />
        </PressableFeedback>
      </View>
      {!hub.loading && hub.materialsTotal > 0 ? (
        <PressableFeedback
          hapticOnPress
          style={styles.materialsLink}
          onPress={() => router.push('/created' as Parameters<typeof router.push>[0])}
        >
          <Text style={styles.materialsLinkText} numberOfLines={2}>
            Центр материалов · {hub.materialsTotal}{' '}
            {hub.materialsTotal === 1 ? 'элемент' : hub.materialsTotal < 5 ? 'элемента' : 'элементов'}
          </Text>
        </PressableFeedback>
      ) : null}
    </SectionCard>
  );
}

function HomeQuickActionsGrid({
  resume,
  live,
  liveLoadPending,
  onSessionPress,
  hub,
  messagesUnreadTotal,
  messagesNeedsReactionCount,
}: {
  resume: ResumeSessionSummary | null;
  live: LiveTrainingSession | null;
  liveLoadPending: boolean;
  onSessionPress: () => void;
  hub: HomeHubState;
  messagesUnreadTotal: number;
  messagesNeedsReactionCount: number;
}) {
  const router = useRouter();
  const liveActive =
    live?.status === 'live' || live?.status === 'review' || live?.status === 'confirmed';
  let sessionLabel = 'Живая тренировка (Arena)';
  if (liveLoadPending) {
    sessionLabel = 'Проверяем тренировку…';
  } else if (live?.status === 'live') {
    sessionLabel = 'Вернуться к тренировке';
  } else if (live?.status === 'review') {
    sessionLabel = 'Перейти к проверке';
  } else if (live?.status === 'confirmed') {
    sessionLabel = 'Завершить отчёт';
  } else if (resume?.source === 'coachInputDraft') {
    sessionLabel = 'Продолжить локальную запись (legacy)';
  } else if (isActiveLiveTrainingResumeSource(resume?.source)) {
    sessionLabel = 'Coach-input (legacy API)';
  }
  const tiles: QuickTile[] = [
    {
      id: 'session',
      label: sessionLabel,
      route: LIVE_TRAINING_START_ROUTE,
      variant: 'primary',
      badge: liveActive || !!resume,
    },
    {
      id: 'messages',
      label: 'Сообщения',
      route: '/messages',
      variant: 'default',
      badge:
        !hub.loading &&
        (messagesNeedsReactionCount > 0 || messagesUnreadTotal > 0),
    },
    {
      id: 'actions',
      label: 'Задачи',
      route: '/actions',
      variant: 'default',
      badge: !hub.loading && !hub.attentionUnavailable && hub.attentionCount > 0,
    },
    {
      id: 'reports',
      label: 'Отчёты',
      route: '/reports',
      variant: 'default',
      badge: !hub.loading && !hub.weeklyReportsUnavailable && hub.weeklyReportsCount > 0,
    },
    {
      id: 'voice',
      label: 'Голос',
      route: '/voice-notes',
      variant: 'default',
      badge: !hub.loading && hub.voiceNotesCount > 0,
    },
  ];

  return (
    <SectionCard elevated style={styles.quickGridCard}>
      <Text style={styles.quickGridTitle}>Быстрые переходы</Text>
      <Text style={styles.quickGridHint}>{COACH_DASHBOARD_COPY.quickGridHint}</Text>
      <View style={styles.quickGrid}>
        {tiles.map((tile) => (
          <PressableFeedback
            key={tile.id}
            hapticOnPress
            style={[
              styles.quickTile,
              tile.variant === 'primary' && styles.quickTilePrimary,
            ]}
            onPress={() => {
              if (tile.id === 'session') onSessionPress();
              else router.push(tile.route as Parameters<typeof router.push>[0]);
            }}
          >
            <View style={styles.quickTileInner}>
              {tile.badge ? <View style={styles.quickTileDot} /> : null}
              <Text
                style={[styles.quickTileText, tile.variant === 'primary' && styles.quickTileTextPrimary]}
                numberOfLines={2}
              >
                {tile.label}
              </Text>
            </View>
          </PressableFeedback>
        ))}
      </View>
    </SectionCard>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const [liveTraining, setLiveTraining] = useState<LiveTrainingSession | null>(null);
  const [liveTrainingLoadPending, setLiveTrainingLoadPending] = useState(true);
  const [liveTrainingLoadError, setLiveTrainingLoadError] = useState<string | null>(null);
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
  const [messagesUnreadTotal, setMessagesUnreadTotal] = useState(0);

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
      loadHomeHubSnapshot().then((snap) => {
        if (cancelled) return;
        setHub({ loading: false, ...snap });
        setHubLoadedOnce(true);
      });
      runActiveLiveTrainingFetch(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [hubLoadedOnce, runActiveLiveTrainingFetch])
  );

  /** Кнопка в блоке «Сейчас» — только канон live-training, без увода в coach-input. */
  const handleStatusCanonLiveTraining = useCallback(() => {
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

  /** Быстрая ячейка «сессия» — текст может быть legacy; маршрут должен совпадать с подписью. */
  const handleQuickGridSession = useCallback(() => {
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
    if (liveTrainingLoadPending) {
      router.push(LIVE_TRAINING_START_ROUTE as Parameters<typeof router.push>[0]);
      return;
    }
    if (liveTrainingLoadError) {
      router.push(LIVE_TRAINING_START_ROUTE as Parameters<typeof router.push>[0]);
      return;
    }
    const r = hub.resume;
    if (r?.source === 'coachInputDraft' || isActiveLiveTrainingResumeSource(r?.source)) {
      router.push(COACH_INPUT_ROUTE as Parameters<typeof router.push>[0]);
      return;
    }
    router.push(LIVE_TRAINING_START_ROUTE as Parameters<typeof router.push>[0]);
  }, [router, liveTraining, liveTrainingLoadPending, liveTrainingLoadError, hub.resume]);

  const handleResetSessionDraft = useCallback(() => {
    Alert.alert(
      'Сбросить локальный legacy-черновик',
      'Локальная запись coach-input будет очищена. Несохранённые наблюдения пропадут. Продолжить?',
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

  const spotlight = buildSpotlightCopy(
    hub,
    messagesNeedsReactionCount,
    messagesAwaitingReplyCount
  );
  const spotlightActions = buildSpotlightActions(hub, messagesNeedsReactionCount);
  const heroSubtitle = hub.loading
    ? undefined
    : liveTrainingLoadPending
      ? 'Загружаем состояние живой тренировки…'
      : liveTrainingLoadError
        ? 'Проверка активной сессии не удалась — нажмите «Повторить» в блоке «Сейчас» или начните live-training.'
        : liveTraining?.status === 'live' ||
            liveTraining?.status === 'review' ||
            liveTraining?.status === 'confirmed'
          ? 'Живая тренировка активна — это основной сценарий Arena. Вернитесь к записи или проверке.'
          : hub.resume?.source === 'coachInputDraft'
            ? COACH_DASHBOARD_COPY.heroSubtitleResume
            : isActiveLiveTrainingResumeSource(hub.resume?.source)
              ? 'Активная legacy-сессия на сервере — при необходимости coach-input; канон — live-training.'
              : COACH_DASHBOARD_COPY.heroSubtitleDefault;
  const showCalmOnboarding =
    !hub.loading &&
    !hub.resume &&
    hub.materialsTotal === 0 &&
    hub.draftsCount === 0 &&
    hub.attentionCount === 0 &&
    messagesNeedsReactionCount === 0 &&
    messagesAwaitingReplyCount === 0 &&
    !hub.attentionUnavailable &&
    !hub.materialsPartial;

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
          setMessagesUnreadTotal(
            list.reduce((s, c) => s + (typeof c.unreadCount === 'number' ? c.unreadCount : 0), 0)
          );
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
          setMessagesUnreadTotal(0);
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
              {(hub.materialsPartial || hub.attentionUnavailable || hub.weeklyReportsUnavailable) ? (
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
                          : 'Живая тренировка (Arena)'
                  }
                  onPress={handleStatusCanonLiveTraining}
                  style={styles.trainingPrimaryCta}
                />
              ) : null}
              {hub.resume?.source === 'coachInputDraft' &&
              liveTraining?.status !== 'live' &&
              liveTraining?.status !== 'review' &&
              liveTraining?.status !== 'confirmed' ? (
                <PressableFeedback
                  style={styles.classicResumeLink}
                  onPress={() => router.push(COACH_INPUT_ROUTE as Parameters<typeof router.push>[0])}
                >
                  <Text style={styles.classicResumeLinkText}>Продолжить локальную запись (legacy)</Text>
                </PressableFeedback>
              ) : null}
              {isActiveLiveTrainingResumeSource(hub.resume?.source) &&
              liveTraining?.status !== 'live' &&
              liveTraining?.status !== 'review' &&
              liveTraining?.status !== 'confirmed' ? (
                <PressableFeedback
                  style={styles.classicResumeLink}
                  onPress={() => router.push(COACH_INPUT_ROUTE as Parameters<typeof router.push>[0])}
                >
                  <Text style={styles.classicResumeLinkText}>Открыть coach-input (legacy API)</Text>
                </PressableFeedback>
              ) : null}
              {hub.resume?.source === 'coachInputDraft' ? (
                <PressableFeedback style={styles.resetLink} onPress={handleResetSessionDraft}>
                  <Text style={styles.resetLinkText}>Сбросить локальный legacy-черновик</Text>
                </PressableFeedback>
              ) : null}
            </StaggerFadeIn>
          )}
        </SectionCard>
      </StaggerFadeIn>

      <StaggerFadeIn delay={12} preset="snappy">
        <HomeSummaryCard
          hub={hub}
          router={router}
          messagesUnreadTotal={messagesUnreadTotal}
          messagesError={messagesError}
        />
      </StaggerFadeIn>

      <StaggerFadeIn delay={18} preset="snappy">
        <HomeQuickActionsGrid
          resume={hub.resume}
          live={liveTraining}
          liveLoadPending={liveTrainingLoadPending}
          onSessionPress={handleQuickGridSession}
          hub={hub}
          messagesUnreadTotal={messagesUnreadTotal}
          messagesNeedsReactionCount={messagesNeedsReactionCount}
        />
      </StaggerFadeIn>

      <StaggerFadeIn delay={26} preset="snappy">
        <SectionCard
          elevated
          style={spotlight.emphasized ? styles.spotlightCardStrong : styles.spotlightCard}
        >
          <Text style={styles.spotlightHeadline}>{spotlight.title}</Text>
          <Text style={styles.spotlightBody}>{spotlight.body}</Text>
          {spotlightActions.length > 0 ? (
            <View style={styles.spotlightRow}>
              {spotlightActions.map((a, i) => (
                <PrimaryButton
                  key={`${a.route}-${a.title}`}
                  animatedPress
                  title={a.title}
                  variant={i === 0 ? 'primary' : 'outline'}
                  onPress={() => router.push(a.route as Parameters<typeof router.push>[0])}
                  style={styles.spotlightRowBtn}
                />
              ))}
            </View>
          ) : null}
        </SectionCard>
      </StaggerFadeIn>

      {showCalmOnboarding ? (
        <StaggerFadeIn delay={32} preset="snappy">
          <SectionCard elevated style={styles.onboardingCard}>
            <View style={styles.onboardingAccent} />
            <Text style={styles.onboardingTitle}>С чего начать</Text>
            <Text style={styles.onboardingBody}>
              Голосовая заметка — удобная точка входа: дальше можно собрать материалы и черновики для родителей.
            </Text>
            <PrimaryButton
              animatedPress
              title="Новая голосовая заметка"
              onPress={() => router.push(VOICE_NOTE_ROUTE)}
            />
          </SectionCard>
        </StaggerFadeIn>
      ) : null}

      <StaggerFadeIn delay={38} preset="snappy">
        <Text style={styles.secondaryHeading}>Дальше на главной</Text>
      </StaggerFadeIn>

      <StaggerFadeIn delay={42}>
        <DashboardSection title="Приоритеты" compact>
          <CoachHomePrioritiesBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={48}>
        <DashboardSection title="Арена">
          <CoachMarkProBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={56}>
        <DashboardSection title="Арена · Сводка" compact>
          <CoachMarkDigestBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={64}>
        <DashboardSection title="Отчёты недели">
          <WeeklyReportsBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={72}>
        <DashboardSection title="Требуют внимания">
          <CoachActionBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={80}>
        <DashboardSection title="Черновики родителям">
          <ParentDraftsBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={96}>
        <DashboardSection title="Ближайшая тренировка" compact>
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
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={108}>
        <DashboardSection title="Посещаемость" compact>
          <SectionCard elevated>
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
                  onPress={() => router.push('/team')}
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
                        setMessagesUnreadTotal(
                          list.reduce((s, c) => s + (typeof c.unreadCount === 'number' ? c.unreadCount : 0), 0)
                        );
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
                onPress={() => router.push('/messages')}
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
    marginBottom: theme.spacing.lg,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  summaryKicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  summaryHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  summaryCellHit: {
    flexGrow: 1,
    minWidth: '28%',
  },
  summaryChip: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
  },
  summaryChipMuted: {
    opacity: 0.88,
  },
  summaryChipValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryChipValueMuted: {
    color: theme.colors.textMuted,
  },
  summaryChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 14,
  },
  materialsLink: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  materialsLinkText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  statusCard: {
    marginBottom: theme.spacing.lg,
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
  statusLoadingRow: {
    marginTop: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  statusSecondary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
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
  trainingPrimaryCta: {
    marginTop: theme.spacing.md,
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
  quickGridCard: {
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  quickGridTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  quickGridHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  quickTile: {
    flexGrow: 1,
    minWidth: '30%',
    maxWidth: '48%',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 72,
    justifyContent: 'center',
  },
  quickTilePrimary: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  quickTileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  quickTileDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  quickTileText: {
    ...theme.typography.subtitle,
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  quickTileTextPrimary: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  spotlightCard: {
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceElevated,
  },
  spotlightCardStrong: {
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceElevated,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  spotlightHeadline: {
    ...theme.typography.subtitle,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.1,
  },
  spotlightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  spotlightRowBtn: {
    flexGrow: 1,
    minWidth: 120,
  },
  spotlightBody: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  onboardingCard: {
    marginBottom: theme.spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.textMuted,
    overflow: 'hidden',
    position: 'relative',
  },
  onboardingAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 56,
    height: 56,
    borderBottomLeftRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primaryMuted,
    opacity: 0.45,
  },
  onboardingTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  onboardingBody: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  secondaryHeading: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
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
    fontSize: 20,
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
    fontSize: 28,
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
    paddingVertical: theme.spacing.md,
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
    paddingVertical: theme.spacing.md,
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
