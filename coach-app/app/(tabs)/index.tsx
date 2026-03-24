import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { CoachHomePrioritiesBlock } from '@/components/dashboard/CoachHomePrioritiesBlock';
import { QuickStartActionsBlock } from '@/components/dashboard/QuickStartActionsBlock';
import { ResumeSessionBlock } from '@/components/dashboard/ResumeSessionBlock';
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

const RECENT_MESSAGES_LIMIT = 5;

function formatContextDate() {
  const d = new Date();
  return d.toLocaleDateString('ru-RU', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function DashboardScreen() {
  const router = useRouter();
  const [teams, setTeams] = useState<CoachTeamItem[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [recentMessages, setRecentMessages] = useState<ConversationCardData[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
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
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      setMessagesLoading(true);
      setMessagesError(null);
      getCoachMessages()
        .then((data) => {
          setRecentMessages((Array.isArray(data) ? data : []).slice(0, RECENT_MESSAGES_LIMIT));
          setMessagesError(null);
        })
        .catch((err) => {
          setRecentMessages([]);
          setMessagesError(isAuthRequiredError(err) ? 'Требуется авторизация' : 'Не удалось загрузить');
        })
        .finally(() => setMessagesLoading(false));
    }, [])
  );

  const dateLabel = formatContextDate();
  const teamsSummary = teamsLoading
    ? '— команд · — игроков'
    : teamsError
      ? 'Ошибка загрузки'
      : `${teams.length} команд · ${teams.reduce((s, t) => s + t.playerCount, 0)} игроков`;

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn delay={0}>
        <DashboardHero dateLabel={dateLabel} teamsSummary={teamsSummary} />
      </StaggerFadeIn>

      <StaggerFadeIn delay={10}>
        <ResumeSessionBlock />
      </StaggerFadeIn>

      <StaggerFadeIn delay={20}>
        <DashboardSection title="Приоритеты">
          <CoachHomePrioritiesBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={30}>
        <DashboardSection title="Быстрые действия" compact>
          <QuickStartActionsBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={45}>
        <DashboardSection title="Coach Mark">
          <CoachMarkProBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={55}>
        <DashboardSection title="Coach Mark · Сводка" compact>
          <CoachMarkDigestBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={70}>
        <DashboardSection title="Отчёты недели">
          <WeeklyReportsBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={90}>
        <DashboardSection title="Требуют внимания">
          <CoachActionBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={110}>
        <DashboardSection title="Черновики родителям">
          <ParentDraftsBlock />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={140}>
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

      <StaggerFadeIn delay={165}>
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

      <StaggerFadeIn delay={190}>
        <DashboardSection title="Мои команды">
          <SectionCard elevated>
            {teamsLoading ? (
              <View style={styles.teamsLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка…</Text>
              </View>
            ) : teamsError ? (
              <View style={styles.errorBlock}>
                <Text style={styles.errorText}>{teamsError}</Text>
                <PrimaryButton
                  title="Повторить"
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
                <Text style={styles.emptyHint}>
                  Попросите администратора назначить вас на команду.
                </Text>
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
                    <Text style={styles.teamCount}>{team.playerCount} игроков</Text>
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

      <StaggerFadeIn delay={220}>
        <DashboardSection title="Сообщения">
          <SectionCard elevated>
            {messagesLoading ? (
              <View style={styles.messagesLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка…</Text>
              </View>
            ) : messagesError ? (
              <View style={styles.messagesErrorBlock}>
                <Text style={styles.errorText}>{messagesError}</Text>
                <PrimaryButton
                  title="Повторить"
                  variant="outline"
                  onPress={() => {
                    setMessagesLoading(true);
                    setMessagesError(null);
                    getCoachMessages()
                      .then((data) => {
                        setRecentMessages((Array.isArray(data) ? data : []).slice(0, RECENT_MESSAGES_LIMIT));
                        setMessagesError(null);
                      })
                      .catch((err) => {
                        setRecentMessages([]);
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
                <Text style={styles.emptyHint}>Диалоги появятся, когда родители напишут</Text>
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
                  <View style={styles.messageContent}>
                    <Text style={[styles.messageFrom, (msg.unreadCount ?? 0) > 0 && styles.messageFromUnread]}>
                      {msg.name ?? 'Диалог'}
                    </Text>
                    <Text style={styles.messagePreview} numberOfLines={1}>
                      {msg.preview ?? '—'}
                    </Text>
                    <Text style={styles.messageTime}>{msg.time || '—'}</Text>
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
  messagesEmptyBlock: {
    paddingVertical: theme.spacing.md,
  },
  messageRow: {
    paddingVertical: theme.spacing.md,
  },
  messageRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  messageContent: {
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
