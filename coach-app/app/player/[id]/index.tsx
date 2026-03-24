import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getParamId } from '@/lib/params';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { StaggerFadeIn } from '@/components/dashboard/StaggerFadeIn';
import { PlayerDetailHero } from '@/components/player-detail/PlayerDetailHero';
import { mergeNotesWithCache } from '@/lib/notesCache';
import { getCoachNotes, type CoachNoteDisplay } from '@/services/coachNotesService';
import { isEndpointUnavailable } from '@/lib/endpointAvailability';
import { getCoachInsightForPlayer } from '@/lib/coachInsightHelpers';
import { CoachInsightBlock } from '@/components/player-detail/CoachInsightBlock';
import { getCoachPlayerDetail, type CoachPlayerDetail } from '@/services/coachPlayersService';
import { isAuthRequiredError } from '@/lib/coachAuth';
import type { PlayerDetailData } from '@/constants/playerDetailData';
import { theme } from '@/constants/theme';

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
    insight: import('@/lib/coachInsightHelpers').CoachInsight;
    observationCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setLoading(false);
        setPlayer(null);
        return;
      }
      setLoading(true);
      setError(null);
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
          setError(isAuthRequiredError(err) ? 'Требуется авторизация' : (err instanceof Error ? err.message : 'Не удалось загрузить игрока'));
        })
        .finally(() => setLoading(false));
    }, [id])
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
          setNotesError(isAuthRequiredError(err) ? 'Требуется авторизация' : (err instanceof Error ? err.message : 'Не удалось загрузить заметки'));
          setApiNotes(null);
        })
        .finally(() => setNotesLoading(false));

      getCoachInsightForPlayer(id).then((data) => {
        setInsightData(data);
      });
    }, [id])
  );

  if (!id) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Игрок не найден</Text>
          <PrimaryButton title="К списку игроков" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Загрузка…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !player) {
    const refetch = () => {
      setLoading(true);
      setError(null);
      getCoachPlayerDetail(id!)
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
          setError(isAuthRequiredError(err) ? 'Требуется авторизация' : (err instanceof Error ? err.message : 'Не удалось загрузить игрока'));
        })
        .finally(() => setLoading(false));
    };
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{error ?? 'Игрок не найден'}</Text>
          <PrimaryButton title="Повторить" variant="outline" onPress={refetch} style={styles.retryBtn} />
          <PrimaryButton title="К списку игроков" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  const { attendance, developmentFocus, recentActivity } = player;
  const baseNotes = apiNotes ?? player.coachNotes;
  const coachNotes = mergeNotesWithCache(baseNotes, player.id);

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn delay={0}>
        <PlayerDetailHero player={player} />
      </StaggerFadeIn>

      <StaggerFadeIn delay={60}>
        <DashboardSection title="Профиль">
          <SectionCard elevated>
            <View style={styles.snapshotRow}>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>Позиция</Text>
                <Text style={styles.snapshotValue}>{player.position}</Text>
              </View>
              <View style={styles.snapshotDivider} />
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>Команда</Text>
                <Text style={styles.snapshotValue}>{player.team}</Text>
              </View>
              <View style={styles.snapshotDivider} />
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>Уровень</Text>
                <Text style={styles.snapshotValue}>{player.level}</Text>
              </View>
            </View>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={120}>
        <DashboardSection title="Посещаемость">
          <SectionCard elevated>
            <View style={styles.attendanceRow}>
              <Text style={styles.attendanceValue}>
                <Text style={styles.attendanceHighlight}>{attendance.attended}</Text>
                <Text style={styles.attendanceSlash}>/{attendance.total}</Text>
              </Text>
              <Text style={styles.attendanceLabel}>тренировок посещено</Text>
              {attendance.lastSession ? (
                <Text style={styles.attendanceLast}>Last: {attendance.lastSession}</Text>
              ) : null}
            </View>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      {developmentFocus ? (
        <StaggerFadeIn delay={180}>
          <DashboardSection title="Фокус развития">
            <SectionCard elevated>
              <Text style={styles.focusText}>{developmentFocus}</Text>
            </SectionCard>
          </DashboardSection>
        </StaggerFadeIn>
      ) : null}

      {insightData ? (
        <StaggerFadeIn delay={developmentFocus ? 200 : 180}>
          <DashboardSection title="Вывод тренера">
            <CoachInsightBlock
              insight={insightData.insight}
              observationCount={insightData.observationCount}
            />
          </DashboardSection>
        </StaggerFadeIn>
      ) : null}

      <StaggerFadeIn delay={developmentFocus ? (insightData ? 260 : 240) : (insightData ? 240 : 180)}>
        <DashboardSection title="Заметки тренера">
          <SectionCard elevated>
            {notesLoading ? (
              <View style={styles.notesLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.notesLoadingText}>Загрузка заметок…</Text>
              </View>
            ) : (
              <>
                {notesError ? (
                  <View style={styles.notesError}>
                    <Text style={styles.notesErrorText}>{notesError}</Text>
                    <PrimaryButton
                      title="Повторить"
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
                            setNotesError(isAuthRequiredError(err) ? 'Требуется авторизация' : (err instanceof Error ? err.message : 'Не удалось загрузить заметки'));
                          })
                          .finally(() => setNotesLoading(false));
                      }}
                      style={styles.notesRetryBtn}
                    />
                  </View>
                ) : null}
                {coachNotes.length > 0 ? (
                  coachNotes.map((note) => (
                    <Pressable
                      key={note.id}
                      style={({ pressed }) => [
                        styles.noteItem,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.noteDate}>{note.date}</Text>
                      <Text style={styles.noteText}>{note.text}</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.emptyText}>
                    {isEndpointUnavailable(`/api/players/${player.id}/notes`)
                      ? 'Модуль заметок пока не подключён'
                      : 'Пока нет заметок'}
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

      <StaggerFadeIn delay={developmentFocus ? (insightData ? 320 : 300) : (insightData ? 280 : 240)}>
        <DashboardSection title="Последняя активность">
          <SectionCard elevated>
            {recentActivity.length > 0 ? (
              recentActivity.map((act) => (
                <View key={act.id} style={styles.activityItem}>
                  <ActivityTypeBadge type={act.type} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{act.title}</Text>
                    <Text style={styles.activityDate}>{act.date}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Нет недавней активности</Text>
            )}
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={developmentFocus ? (insightData ? 380 : 360) : (insightData ? 340 : 300)}>
        <DashboardSection title="Быстрые действия">
          <SectionCard elevated>
            <View style={styles.actions}>
              <PrimaryButton
                title="Добавить заметку"
                variant="primary"
                onPress={() => router.push(`/notes/${player.id}`)}
                style={styles.actionBtn}
              />
              <PrimaryButton
                title="Открыть"
                variant="outline"
                onPress={() => router.push(`/player/${player.id}/report`)}
                style={styles.actionBtn}
              />
              <PrimaryButton
                title="Написать родителю"
                variant="ghost"
                onPress={() => router.push({ pathname: '/unavailable', params: { module: 'write-parent' } })}
                style={styles.actionBtn}
              />
              <PrimaryButton
                title="Прогресс"
                variant="ghost"
                onPress={() => router.push({ pathname: '/unavailable', params: { module: 'progress' } })}
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
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xxl,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  notFound: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  notFoundText: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  retryBtn: { marginBottom: theme.spacing.sm },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  snapshotItem: {
    flex: 1,
    alignItems: 'center',
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
  focusText: {
    ...theme.typography.body,
    color: theme.colors.text,
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
  pressed: {
    opacity: 0.8,
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
    gap: theme.spacing.md,
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
});
