import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getParamId } from '@/lib/params';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PressableFeedback } from '@/components/ui/PressableFeedback';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { StaggerFadeIn } from '@/components/dashboard/StaggerFadeIn';
import { PlayerDetailHero } from '@/components/player-detail/PlayerDetailHero';
import {
  CoachDetailErrorState,
  CoachDetailLoadingBody,
} from '@/components/details/CoachDetailScreenPrimitives';
import { mergeNotesWithCache } from '@/lib/notesCache';
import { getCoachNotes, type CoachNoteDisplay } from '@/services/coachNotesService';
import { isEndpointUnavailable } from '@/lib/endpointAvailability';
import { getCoachInsightForPlayer, type CoachInsight } from '@/lib/coachInsightHelpers';
import {
  getCoachPlayerDetail,
  getPlayerAttendanceSummary,
  getAttendanceSummaryRangeDays,
  type CoachPlayerDetail,
  type PlayerAttendanceSummary,
} from '@/services/coachPlayersService';
import { getCoachActionItems, type CoachActionItem } from '@/lib/coachActionHelpers';
import { getCoachMessages } from '@/services/coachMessagesService';
import { isAuthRequiredError } from '@/lib/coachAuth';
import type { PlayerDetailData } from '@/constants/playerDetailData';
import { theme } from '@/constants/theme';
import {
  COACH_AUTH_REQUIRED_LINE,
  COACH_PLAYER_DETAIL_COPY,
  coachPlayerDetailQueueHintMany,
} from '@/lib/coachPlayerDetailUi';
import {
  buildVoiceStarterFromVoiceRecap,
  enrichVoiceStarterWithAi,
  saveVoiceStarterPayload,
} from '@/lib/voiceMvp';

function mapToPlayerDetailData(d: CoachPlayerDetail): PlayerDetailData {
  return {
    id: d.id,
    name: d.name,
    number: d.number,
    position: d.position as 'F' | 'D' | 'G',
    team: d.team,
    teamId: d.teamId ?? '',
    level: d.level,
    attendance: {
      attended: d.attendance.attended,
      total: d.attendance.total,
      lastSession: d.attendance.lastSession,
    },
    coachNotes: [],
    recentActivity: [],
  };
}

function priorityTone(p: 1 | 2 | 3): 'danger' | 'warning' | 'info' {
  if (p === 1) return 'danger';
  if (p === 2) return 'warning';
  return 'info';
}

function priorityShortRu(p: 1 | 2 | 3): string {
  if (p === 1) return 'Высокий';
  if (p === 2) return 'Средний';
  return 'Ниже';
}

function PerformanceSnapshotSection({
  insightData,
  developmentFocus,
  attendanceSummary,
  lastSessionLabel,
  coachNotesPreview,
}: {
  insightData: { insight: CoachInsight; observationCount: number } | null;
  developmentFocus?: string;
  attendanceSummary: PlayerAttendanceSummary | null;
  lastSessionLabel?: string;
  coachNotesPreview: string | null;
}) {
  const insight = insightData?.insight;
  const strengths = insight?.positives?.slice(0, 2) ?? [];
  const growth = insight?.concerns?.slice(0, 2) ?? [];
  const recentLine = insight
    ? insight.summary
    : attendanceSummary
      ? `Посещаемость за 90 дней: ${Math.round(attendanceSummary.attendanceRate)}% (${attendanceSummary.presentCount}/${attendanceSummary.totalSessions} явок).`
      : lastSessionLabel
        ? `Последняя отметка в CRM: ${lastSessionLabel}.`
        : coachNotesPreview
          ? `Свежая заметка: ${coachNotesPreview}`
          : null;

  return (
    <SectionCard elevated style={styles.snapshotCard}>
      <Text style={styles.snapshotIntro}>{COACH_PLAYER_DETAIL_COPY.snapshotIntro}</Text>

      {insight ? (
        <>
          <View style={styles.snapshotBlock}>
            <Text style={styles.snapshotBlockLabel}>Сильные стороны</Text>
            {strengths.length > 0 ? (
              strengths.map((s, i) => (
                <Text key={i} style={styles.snapshotBullet}>
                  • {s}
                </Text>
              ))
            ) : (
              <Text style={styles.snapshotMuted}>Пока мало выводов — продолжайте отмечать наблюдения на тренировках.</Text>
            )}
          </View>
          <View style={styles.snapshotBlock}>
            <Text style={styles.snapshotBlockLabel}>Зоны роста</Text>
            {growth.length > 0 ? (
              growth.map((s, i) => (
                <Text key={i} style={[styles.snapshotBullet, styles.snapshotBulletWarn]}>
                  • {s}
                </Text>
              ))
            ) : (
              <Text style={styles.snapshotMuted}>Явных рисков в правилах insight нет — держите фокус в заметках.</Text>
            )}
          </View>
          <View style={styles.snapshotBlock}>
            <Text style={styles.snapshotBlockLabel}>Последние изменения</Text>
            <Text style={styles.snapshotBody}>{recentLine}</Text>
            <Text style={styles.snapshotFootnote}>Опирается на {insightData!.observationCount} наблюдений в приложении.</Text>
          </View>
        </>
      ) : (
        <>
          {developmentFocus ? (
            <View style={styles.snapshotBlock}>
              <Text style={styles.snapshotBlockLabel}>Фокус развития</Text>
              <Text style={styles.snapshotBody}>{developmentFocus}</Text>
            </View>
          ) : null}
          <View style={styles.snapshotBlock}>
            <Text style={styles.snapshotBlockLabel}>Последние изменения</Text>
            {recentLine ? (
              <Text style={styles.snapshotBody}>{recentLine}</Text>
            ) : (
              <Text style={styles.snapshotMuted}>
                Наберите минимум три наблюдения по игроку в тренировочном потоке — тогда здесь появится автоматический вывод.
                Пока ориентируйтесь на заметки и посещаемость ниже.
              </Text>
            )}
          </View>
        </>
      )}
    </SectionCard>
  );
}

function ActivityTypeBadge({ type }: { type: 'practice' | 'game' | 'assessment' }) {
  const label = type === 'practice' ? 'Тренировка' : type === 'game' ? 'Игра' : 'Оценка';
  const isGame = type === 'game';

  return (
    <View
      style={[
        styles.activityBadge,
        { backgroundColor: isGame ? theme.colors.accentMuted : theme.colors.surfaceElevated },
      ]}
    >
      <Text
        style={[
          styles.activityBadgeText,
          { color: isGame ? theme.colors.accent : theme.colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function PlayerDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = getParamId(params.id);
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerDetailData | null>(null);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [apiNotes, setApiNotes] = useState<CoachNoteDisplay[] | null>(null);
  const [insightData, setInsightData] = useState<{
    insight: CoachInsight;
    observationCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<PlayerAttendanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [playerQueueItems, setPlayerQueueItems] = useState<CoachActionItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [parentConversationId, setParentConversationId] = useState<string | null>(null);

  const fetchPlayerCore = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setSummaryLoading(true);
    setSummaryError(null);
    const range = getAttendanceSummaryRangeDays(90);
    getCoachPlayerDetail(id)
      .then((data) => {
        if (data) {
          setPlayer(mapToPlayerDetailData(data));
          setError(null);
        } else {
          setPlayer(null);
          setError('Игрок не найден');
        }
      })
      .catch((err) => {
        setPlayer(null);
        setError(
          isAuthRequiredError(err)
            ? COACH_AUTH_REQUIRED_LINE
            : 'Не удалось загрузить карточку игрока.'
        );
      })
      .finally(() => setLoading(false));

    getPlayerAttendanceSummary(id, range.fromDate, range.toDate)
      .then((sum) => {
        setAttendanceSummary(sum);
        setSummaryError(sum ? null : 'Не удалось загрузить посещаемость');
      })
      .catch(() => {
        setAttendanceSummary(null);
        setSummaryError('Не удалось загрузить посещаемость');
      })
      .finally(() => setSummaryLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setLoading(false);
        setPlayer(null);
        return;
      }
      fetchPlayerCore();
    }, [id, fetchPlayerCore])
  );

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setNotesLoading(true);
      setNotesError(null);
      getCoachNotes(id)
        .then((notes) => {
          setApiNotes(notes);
          setNotesError(null);
        })
        .catch((err) => {
          setNotesError(
            isAuthRequiredError(err)
              ? COACH_AUTH_REQUIRED_LINE
              : 'Не удалось загрузить заметки.'
          );
          setApiNotes(null);
        })
        .finally(() => setNotesLoading(false));

      getCoachInsightForPlayer(id).then((data) => {
        setInsightData(data);
      });

      setQueueLoading(true);
      getCoachActionItems()
        .then((list) => {
          const mine = list.filter((it) => String(it.playerId) === String(id));
          mine.sort((a, b) => a.priority - b.priority);
          setPlayerQueueItems(mine);
        })
        .catch(() => setPlayerQueueItems([]))
        .finally(() => setQueueLoading(false));

      getCoachMessages()
        .then((list) => {
          const hit = list.find((c) => c.type === 'parent' && c.playerId && String(c.playerId) === String(id));
          setParentConversationId(hit?.id ?? null);
        })
        .catch(() => setParentConversationId(null));
    }, [id])
  );

  const handleStartTaskForPlayer = useCallback(async () => {
    if (!player) return;
    try {
      const built = buildVoiceStarterFromVoiceRecap({
        intent: 'action_item',
        transcript: ' ',
        summary: `Задача по игроку: ${player.name}`,
        highlights: [player.position, player.team].filter(Boolean),
        context: {
          playerId: player.id,
          playerLabel: player.name,
          sessionHint: 'Из карточки игрока',
        },
      });
      const payload = await enrichVoiceStarterWithAi(built);
      const starterId = await saveVoiceStarterPayload(payload);
      router.push({
        pathname: '/voice-starter/action-item',
        params: { voiceStarterId: starterId },
      });
    } catch {
      Alert.alert('Не удалось открыть черновик', 'Попробуйте ещё раз или создайте задачу через голосовую заметку.');
    }
  }, [player, router]);

  const handleOpenParentDialog = useCallback(() => {
    if (parentConversationId) {
      router.push(`/conversation/${parentConversationId}`);
      return;
    }
    router.push('/(tabs)/messages' as Parameters<typeof router.push>[0]);
  }, [parentConversationId, router]);

  const keyMetric = useMemo(() => {
    if (!player) return null;
    const { attendance } = player;
    if (attendanceSummary) {
      return {
        label: 'Посещаемость (90 дн.)',
        value: `${Math.round(attendanceSummary.attendanceRate)}%`,
      };
    }
    if (attendance.total > 0) {
      return {
        label: 'Тренировки (CRM)',
        value: `${attendance.attended}/${attendance.total}`,
      };
    }
    return null;
  }, [player, attendanceSummary]);

  const queueHint = useMemo(() => {
    if (queueLoading) return COACH_PLAYER_DETAIL_COPY.queueLoading;
    if (playerQueueItems.length === 0) {
      return COACH_PLAYER_DETAIL_COPY.queueHintEmpty;
    }
    if (playerQueueItems.length === 1) return COACH_PLAYER_DETAIL_COPY.queueHintOne;
    return coachPlayerDetailQueueHintMany(playerQueueItems.length);
  }, [queueLoading, playerQueueItems.length]);

  if (!id) {
    return (
      <ScreenContainer>
        <CoachDetailErrorState
          title="Игрок не найден"
          description="Проверьте список игроков и повторите переход."
          retryTitle="К списку игроков"
          onRetry={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <CoachDetailLoadingBody
          eyebrow={COACH_PLAYER_DETAIL_COPY.heroEyebrow}
          title={COACH_PLAYER_DETAIL_COPY.loadingTitle}
          subtitle={COACH_PLAYER_DETAIL_COPY.loadingSubtitle}
        />
      </ScreenContainer>
    );
  }

  if (error || !player) {
    const refetch = () => {
      fetchPlayerCore();
    };
    return (
      <ScreenContainer>
        <CoachDetailErrorState
          title="Карточка сейчас недоступна"
          description={error ?? 'Не удалось загрузить данные игрока.'}
          hint={
            error && error !== COACH_AUTH_REQUIRED_LINE
              ? COACH_PLAYER_DETAIL_COPY.networkRetryHint
              : undefined
          }
          onRetry={refetch}
          backTitle="К списку игроков"
          onBack={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  const { attendance, developmentFocus, recentActivity } = player;
  const baseNotes = apiNotes ?? player.coachNotes;
  const coachNotes = mergeNotesWithCache(baseNotes, player.id);

  const topQueueItems = playerQueueItems.slice(0, 3);
  const coachNotesPreview =
    coachNotes.length > 0 ? coachNotes[0]!.text.replace(/\s+/g, ' ').trim().slice(0, 120) : null;

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn delay={0}>
        <PlayerDetailHero player={player} keyMetric={keyMetric} queueHint={queueHint} />
      </StaggerFadeIn>

      <StaggerFadeIn delay={24}>
        <DashboardSection title="Быстрые действия">
          <SectionCard elevated style={styles.quickCard}>
            <Text style={styles.quickHint}>{COACH_PLAYER_DETAIL_COPY.quickHint}</Text>
            <View style={styles.quickRow}>
              <PrimaryButton
                animatedPress
                title="Задача"
                onPress={() => {
                  void handleStartTaskForPlayer();
                }}
                style={styles.quickBtn}
              />
              <PrimaryButton
                animatedPress
                title={parentConversationId ? 'Диалог' : 'Сообщения'}
                variant="outline"
                onPress={handleOpenParentDialog}
                style={styles.quickBtn}
              />
              <PrimaryButton
                animatedPress
                title="Голос"
                variant="outline"
                onPress={() => router.push('/voice-note')}
                style={styles.quickBtn}
              />
            </View>
            {!parentConversationId ? (
              <Text style={styles.quickFootnote}>{COACH_PLAYER_DETAIL_COPY.quickFootnote}</Text>
            ) : null}
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={40}>
        <DashboardSection title="Что требует внимания">
          <SectionCard elevated style={styles.attentionCard}>
            <Text style={styles.attentionIntro}>{COACH_PLAYER_DETAIL_COPY.attentionIntro}</Text>
            {queueLoading ? (
              <View style={styles.queueLoadingRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.attentionMuted}>{COACH_PLAYER_DETAIL_COPY.queueLoading}</Text>
              </View>
            ) : topQueueItems.length === 0 ? (
              <Text style={styles.attentionMuted}>{COACH_PLAYER_DETAIL_COPY.attentionQueueEmpty}</Text>
            ) : (
              <>
                {topQueueItems.map((it) => {
                  const tone = priorityTone(it.priority);
                  return (
                    <View key={`${it.playerId}-${it.status}-${it.actionLine}`} style={styles.attentionRow}>
                      <View
                        style={[
                          styles.attentionAccent,
                          tone === 'danger' && styles.attentionAccentDanger,
                          tone === 'warning' && styles.attentionAccentWarning,
                          tone === 'info' && styles.attentionAccentInfo,
                        ]}
                      />
                      <View style={styles.attentionRowBody}>
                        <View style={styles.attentionRowTop}>
                          <Text style={styles.attentionPriority}>{priorityShortRu(it.priority)}</Text>
                          <Text style={styles.attentionStatus} numberOfLines={1}>
                            {it.status}
                          </Text>
                        </View>
                        <Text style={styles.attentionLine} numberOfLines={3}>
                          {it.actionLine?.trim() || 'Без описания — см. детали в очереди.'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                <PrimaryButton
                  animatedPress
                  title="Вся очередь задач"
                  variant="outline"
                  onPress={() => router.push('/actions')}
                  style={styles.attentionCta}
                />
              </>
            )}
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={56}>
        <DashboardSection title="Прогресс и фокус">
          <PerformanceSnapshotSection
            insightData={insightData}
            developmentFocus={developmentFocus}
            attendanceSummary={attendanceSummary}
            lastSessionLabel={attendance.lastSession}
            coachNotesPreview={coachNotesPreview}
          />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={72}>
        <DashboardSection title="Профиль">
          <SectionCard elevated>
            <View style={styles.snapshotRow}>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>Позиция</Text>
                <Text style={styles.snapshotValue} numberOfLines={2}>
                  {player.position}
                </Text>
              </View>
              <View style={styles.snapshotDivider} />
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>Команда</Text>
                <Text style={styles.snapshotValue} numberOfLines={2}>
                  {player.team}
                </Text>
              </View>
              <View style={styles.snapshotDivider} />
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>Уровень</Text>
                <Text style={styles.snapshotValue} numberOfLines={2}>
                  {player.level}
                </Text>
              </View>
            </View>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={88}>
        <DashboardSection title="Посещаемость">
          <SectionCard elevated>
            {summaryLoading ? (
              <View style={styles.summaryLoadingRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.attendanceLabel}>{COACH_PLAYER_DETAIL_COPY.attendanceLoading}</Text>
              </View>
            ) : summaryError ? (
              <View>
                <Text style={styles.notesErrorText}>{summaryError}</Text>
                {summaryError !== COACH_AUTH_REQUIRED_LINE ? (
                  <Text style={styles.inlineRetryHint}>{COACH_PLAYER_DETAIL_COPY.networkRetryHint}</Text>
                ) : null}
                <PrimaryButton
                  title={COACH_PLAYER_DETAIL_COPY.retryCta}
                  variant="outline"
                  onPress={() => {
                    if (!id) return;
                    setSummaryLoading(true);
                    setSummaryError(null);
                    const range = getAttendanceSummaryRangeDays(90);
                    getPlayerAttendanceSummary(id, range.fromDate, range.toDate)
                      .then((sum) => {
                        setAttendanceSummary(sum);
                        setSummaryError(sum ? null : 'Не удалось загрузить посещаемость');
                      })
                      .catch(() => {
                        setAttendanceSummary(null);
                        setSummaryError('Не удалось загрузить посещаемость');
                      })
                      .finally(() => setSummaryLoading(false));
                  }}
                  style={styles.notesRetryBtn}
                />
              </View>
            ) : attendanceSummary ? (
              <View style={styles.attendanceSummaryBlock}>
                <Text style={styles.attendancePct}>{attendanceSummary.attendanceRate}%</Text>
                <Text style={styles.attendanceLabel}>посещаемость за период</Text>
                <View style={styles.attendanceStatsRow}>
                  <Text style={styles.attendanceStatLine}>
                    Всего тренировок в периоде:{' '}
                    <Text style={styles.attendanceStatEm}>{attendanceSummary.totalSessions}</Text>
                  </Text>
                  <Text style={styles.attendanceStatLine}>
                    Был: {attendanceSummary.presentCount} · Пропусков:{' '}
                    <Text style={styles.attendanceStatEm}>{attendanceSummary.absentCount}</Text>
                  </Text>
                </View>
                <Text style={styles.attendanceLast}>Период: последние 90 дней</Text>
              </View>
            ) : (
              <View style={styles.attendanceRow}>
                <Text style={styles.attendanceValue}>
                  <Text style={styles.attendanceHighlight}>{attendance.attended}</Text>
                  <Text style={styles.attendanceSlash}>/{attendance.total}</Text>
                </Text>
                <Text style={styles.attendanceLabel}>тренировок посещено (CRM)</Text>
                {attendance.lastSession ? (
                  <Text style={styles.attendanceLast}>Последняя сессия: {attendance.lastSession}</Text>
                ) : null}
              </View>
            )}
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={104}>
        <DashboardSection title="Заметки тренера">
          <SectionCard elevated>
            {notesLoading ? (
              <View style={styles.notesLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.notesLoadingText}>{COACH_PLAYER_DETAIL_COPY.notesLoading}</Text>
              </View>
            ) : (
              <>
                {notesError ? (
                  <View style={styles.notesError}>
                    <Text style={styles.notesErrorText}>{notesError}</Text>
                    {notesError !== COACH_AUTH_REQUIRED_LINE ? (
                      <Text style={styles.inlineRetryHint}>{COACH_PLAYER_DETAIL_COPY.networkRetryHint}</Text>
                    ) : null}
                    <PrimaryButton
                      title={COACH_PLAYER_DETAIL_COPY.retryCta}
                      variant="outline"
                      onPress={() => {
                        setNotesLoading(true);
                        setNotesError(null);
                        getCoachNotes(player.id)
                          .then((notes) => {
                            setApiNotes(notes);
                            setNotesError(null);
                          })
                          .catch((err) => {
                            setNotesError(
                              isAuthRequiredError(err)
                                ? COACH_AUTH_REQUIRED_LINE
                                : 'Не удалось загрузить заметки.'
                            );
                          })
                          .finally(() => setNotesLoading(false));
                      }}
                      style={styles.notesRetryBtn}
                    />
                  </View>
                ) : null}
                {coachNotes.length > 0 ? (
                  coachNotes.map((note) => (
                    <PressableFeedback key={note.id} style={styles.noteItem}>
                      <View style={styles.noteRow}>
                        <View style={styles.noteTextCol}>
                          <Text style={styles.noteDate}>{note.date}</Text>
                          <Text style={styles.noteText} numberOfLines={6}>
                            {note.text}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                      </View>
                    </PressableFeedback>
                  ))
                ) : (
                  <Text style={styles.emptyText}>
                    {isEndpointUnavailable(`/api/players/${player.id}/notes`)
                      ? 'Раздел заметок будет доступен после подключения модуля.'
                      : 'Пока нет заметок по игроку.'}
                  </Text>
                )}
              </>
            )}
            <PrimaryButton
              title="Добавить заметку"
              variant="outline"
              onPress={() => router.push(`/notes/${player.id}`)}
              style={styles.noteCta}
            />
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={120}>
        <DashboardSection title="Последняя активность">
          <SectionCard elevated>
            {recentActivity.length > 0 ? (
              recentActivity.map((act) => (
                <View key={act.id} style={styles.activityItem}>
                  <ActivityTypeBadge type={act.type} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle} numberOfLines={2}>
                      {act.title}
                    </Text>
                    <Text style={styles.activityDate}>{act.date}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>{COACH_PLAYER_DETAIL_COPY.activityEmpty}</Text>
            )}
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={136}>
        <DashboardSection title="Дополнительно">
          <SectionCard elevated>
            <View style={styles.actions}>
              <PrimaryButton
                title="Отчёт по игроку"
                variant="outline"
                onPress={() => router.push(`/player/${player.id}/report`)}
                style={styles.actionBtn}
              />
              <PrimaryButton
                title="Поделиться отчётом"
                variant="ghost"
                onPress={() => router.push(`/player/${player.id}/share-report`)}
                style={styles.actionBtn}
              />
            </View>
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
  quickCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  quickHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: theme.spacing.md,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  quickBtn: {
    flexGrow: 1,
    minWidth: 96,
  },
  quickFootnote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  attentionCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  attentionIntro: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  queueLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  attentionMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceElevated,
  },
  attentionAccent: {
    width: 3,
    backgroundColor: theme.colors.accent,
  },
  attentionAccentDanger: {
    backgroundColor: theme.colors.error,
  },
  attentionAccentWarning: {
    backgroundColor: theme.colors.warning,
  },
  attentionAccentInfo: {
    backgroundColor: theme.colors.accent,
  },
  attentionRowBody: {
    flex: 1,
    padding: theme.spacing.sm,
    minWidth: 0,
  },
  attentionRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  attentionPriority: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.35,
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  attentionStatus: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    flex: 1,
    textAlign: 'right',
  },
  attentionLine: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  attentionCta: {
    marginTop: theme.spacing.sm,
    alignSelf: 'stretch',
  },
  snapshotCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  snapshotIntro: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: theme.spacing.md,
  },
  snapshotBlock: {
    marginBottom: theme.spacing.md,
  },
  snapshotBlockLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  snapshotBullet: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginLeft: theme.spacing.xs,
  },
  snapshotBulletWarn: {
    color: theme.colors.warning,
  },
  snapshotBody: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  snapshotMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  snapshotFootnote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  snapshotItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  snapshotDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  snapshotLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  snapshotValue: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    textAlign: 'center',
  },
  attendanceRow: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  attendanceValue: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontSize: 28,
  },
  attendanceHighlight: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  attendanceSlash: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  attendanceLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  attendanceLast: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  notesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  notesLoadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  notesError: {
    paddingVertical: theme.spacing.md,
  },
  notesErrorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  inlineRetryHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  notesRetryBtn: {
    alignSelf: 'flex-start',
  },
  noteItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  noteTextCol: {
    flex: 1,
    minWidth: 0,
  },
  noteDate: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  noteText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  noteCta: {
    marginTop: theme.spacing.md,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    paddingVertical: theme.spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  activityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  activityContent: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  activityDate: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  actionBtn: {
    width: '100%',
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
  summaryLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  attendanceSummaryBlock: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  attendancePct: {
    ...theme.typography.title,
    fontSize: 32,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  attendanceStatsRow: {
    marginTop: theme.spacing.sm,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  attendanceStatLine: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  attendanceStatEm: {
    color: theme.colors.text,
    fontWeight: '600',
  },
});
