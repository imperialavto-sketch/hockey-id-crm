import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { StaggerFadeIn } from '@/components/dashboard/StaggerFadeIn';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { PressableFeedback } from '@/components/ui/PressableFeedback';
import { MessagesHero } from '@/components/messages/MessagesHero';
import { MessagesOverview } from '@/components/messages/MessagesOverview';
import {
  MessagesFilterSegment,
  type MessagesFilterOption,
} from '@/components/messages/MessagesFilterSegment';
import {
  ConversationCard,
  type ConversationCardData,
} from '@/components/messages/ConversationCard';
import {
  CoachListHero,
  CoachListSkeletonCard,
  formatCoachListContextDate,
} from '@/components/lists/CoachListScreenPrimitives';
import { getCoachMessages } from '@/services/coachMessagesService';
import { isEndpointUnavailable, clearEndpointUnavailable, COACH_ENDPOINTS } from '@/lib/endpointAvailability';
import { isAuthRequiredError } from '@/lib/coachAuth';
import { theme } from '@/constants/theme';
import {
  COACH_MESSAGES_AUTH_LINE,
  COACH_MESSAGES_INBOX_COPY,
} from '@/lib/coachMessagesInboxUi';

function filterConversations(
  convos: ConversationCardData[],
  filter: MessagesFilterOption
): ConversationCardData[] {
  if (filter === 'all') return convos;
  if (filter === 'parents') return convos.filter((c) => c.type === 'parent');
  if (filter === 'teams')
    return convos.filter((c) => c.type === 'team' || c.type === 'announcement');
  if (filter === 'unread') return convos.filter((c) => (c.unreadCount ?? 0) > 0);
  if (filter === 'needsReaction')
    return convos.filter((c) => c.needsCoachReaction === true);
  if (filter === 'awaitingReply')
    return convos.filter((c) => c.awaitingParentReply === true);
  return convos;
}

function sortInboxPriority(list: ConversationCardData[], order: Map<string, number>): ConversationCardData[] {
  return [...list].sort((a, b) => {
    const ar = a.needsCoachReaction ? 1 : 0;
    const br = b.needsCoachReaction ? 1 : 0;
    if (ar !== br) return br - ar;
    const ua = a.unreadCount ?? 0;
    const ub = b.unreadCount ?? 0;
    if (ua !== ub) return ub - ua;
    const aw = a.awaitingParentReply ? 1 : 0;
    const bw = b.awaitingParentReply ? 1 : 0;
    if (aw !== bw) return bw - aw;
    return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
  });
}

function buildSummaryLines(params: {
  total: number;
  visible: number;
  filter: MessagesFilterOption;
  unreadCount: number;
  needsReactionCount: number;
  awaitingReplyCount: number;
  parentCount: number;
  teamCount: number;
}): { primary: string; secondary: string | null; nextStep: string | null } {
  const {
    total,
    visible,
    filter,
    unreadCount,
    needsReactionCount,
    awaitingReplyCount,
    parentCount,
    teamCount,
  } = params;

  if (total === 0) {
    return {
      primary: COACH_MESSAGES_INBOX_COPY.summaryWhenEmpty,
      secondary: null,
      nextStep: null,
    };
  }

  let primary = `В inbox ${total === 1 ? '1 диалог' : `${total} диалогов`} — родители, команда и служебные треды.`;
  if (filter !== 'all') {
    primary = `По фильтру «${filterLabelRu(filter)}»: ${visible} из ${total}.`;
  }

  const parts: string[] = [];
  if (needsReactionCount > 0) {
    parts.push(
      needsReactionCount === 1
        ? '1 диалог с ответом родителя — стоит открыть.'
        : `${needsReactionCount} диалогов ждут вашего ответа.`
    );
  }
  if (unreadCount > 0) {
    parts.push(unreadCount === 1 ? '1 непрочитанный тред.' : `${unreadCount} непрочитанных.`);
  }
  if (awaitingReplyCount > 0 && needsReactionCount === 0) {
    parts.push('Часть диалогов в ожидании ответа родителей.');
  }
  if (parentCount > 0 || teamCount > 0) {
    const ctx = [
      parentCount > 0 ? `${parentCount} с родителями` : null,
      teamCount > 0 ? `${teamCount} командных/объявления` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    if (ctx && !parts.length) {
      parts.push(ctx + '.');
    }
  }

  const secondary =
    parts.length > 0
      ? parts.join(' ')
      : filter === 'all'
        ? 'Сейчас без срочных сигналов — пройдите список сверху вниз.'
        : null;

  let nextStep: string | null = null;
  if (needsReactionCount > 0) {
    nextStep = 'Следующий шаг: откройте диалог с ответом родителя — ответьте или зафиксируйте follow-up в задачах.';
  } else if (unreadCount > 0) {
    nextStep = 'Следующий шаг: просмотрите непрочитанные треды.';
  } else if (total > 0) {
    nextStep = 'Следующий шаг: загляните в актуальные диалоги или вернитесь на главную для остального контура.';
  }

  return { primary, secondary, nextStep };
}

function filterLabelRu(f: MessagesFilterOption): string {
  switch (f) {
    case 'all':
      return 'все';
    case 'parents':
      return 'родители';
    case 'teams':
      return 'команда';
    case 'unread':
      return 'непрочитанные';
    case 'needsReaction':
      return 'нужен ответ';
    case 'awaitingReply':
      return 'ждём родителя';
    default:
      return f;
  }
}

function MessagesErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isAuth = message === COACH_MESSAGES_AUTH_LINE;
  return (
    <SectionCard elevated style={styles.errorCard}>
      <Text style={styles.errorHeading}>{COACH_MESSAGES_INBOX_COPY.errorHeading}</Text>
      <Text style={styles.errorBody}>{COACH_MESSAGES_INBOX_COPY.errorBody}</Text>
      {message ? (
        <Text style={styles.errorDetail} numberOfLines={3}>
          {message}
        </Text>
      ) : null}
      {!isAuth ? (
        <Text style={styles.errorHint}>{COACH_MESSAGES_INBOX_COPY.networkRetryHint}</Text>
      ) : null}
      <PrimaryButton
        animatedPress
        title={COACH_MESSAGES_INBOX_COPY.retryCta}
        variant="outline"
        onPress={onRetry}
        style={styles.errorRetry}
      />
    </SectionCard>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<MessagesFilterOption>('all');
  const [conversations, setConversations] = useState<ConversationCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback((opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    setError(null);
    getCoachMessages()
      .then((data) => {
        setConversations(Array.isArray(data) ? data : []);
        setError(null);
        setLoadedOnce(true);
      })
      .catch((err) => {
        setConversations([]);
        setError(
          isAuthRequiredError(err) ? COACH_MESSAGES_AUTH_LINE : 'Не удалось загрузить сообщения'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchMessages({ silent: loadedOnce });
    }, [fetchMessages, loadedOnce])
  );

  const conversationOrder = useMemo(
    () => new Map(conversations.map((c, i) => [c.id, i])),
    [conversations]
  );

  const filteredConversations = useMemo(
    () => filterConversations(conversations, filter),
    [conversations, filter]
  );

  const displayConversations = useMemo(
    () => sortInboxPriority(filteredConversations, conversationOrder),
    [filteredConversations, conversationOrder]
  );
  const firstNeedsReactionConversation = useMemo(
    () => conversations.find((c) => c.needsCoachReaction === true) ?? null,
    [conversations]
  );

  const counts = useMemo(
    () => ({
      all: conversations.length,
      parents: conversations.filter((c) => c.type === 'parent').length,
      teams: conversations.filter(
        (c) => c.type === 'team' || c.type === 'announcement'
      ).length,
      unread: conversations.filter((c) => (c.unreadCount ?? 0) > 0).length,
      needsReaction: conversations.filter((c) => c.needsCoachReaction === true)
        .length,
      awaitingReply: conversations.filter((c) => c.awaitingParentReply === true)
        .length,
    }),
    [conversations]
  );

  const summaryPack = useMemo(
    () =>
      buildSummaryLines({
        total: conversations.length,
        visible: displayConversations.length,
        filter,
        unreadCount: counts.unread,
        needsReactionCount: counts.needsReaction,
        awaitingReplyCount: counts.awaitingReply,
        parentCount: counts.parents,
        teamCount: counts.teams,
      }),
    [
      conversations.length,
      displayConversations.length,
      filter,
      counts.unread,
      counts.needsReaction,
      counts.awaitingReply,
      counts.parents,
      counts.teams,
    ]
  );

  const showEmpty = displayConversations.length === 0;
  const dateLabel = formatCoachListContextDate();

  if (loading && !loadedOnce) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <StaggerFadeIn delay={0}>
          <CoachListHero
            eyebrow={COACH_MESSAGES_INBOX_COPY.listEyebrow}
            title={COACH_MESSAGES_INBOX_COPY.listTitle}
            dateLabel={dateLabel}
            countLabel={COACH_MESSAGES_INBOX_COPY.loadingCount}
            subtitle={COACH_MESSAGES_INBOX_COPY.loadingSubtitle}
          />
        </StaggerFadeIn>
        <StaggerFadeIn delay={14}>
          <CoachListSkeletonCard />
        </StaggerFadeIn>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <StaggerFadeIn delay={0}>
          <CoachListHero
            eyebrow={COACH_MESSAGES_INBOX_COPY.listEyebrow}
            title={COACH_MESSAGES_INBOX_COPY.listTitle}
            dateLabel={dateLabel}
            countLabel="—"
            subtitle={COACH_MESSAGES_INBOX_COPY.errorHeroSubtitle}
          />
        </StaggerFadeIn>
        <StaggerFadeIn delay={16}>
          <MessagesErrorCard message={error} onRetry={() => void fetchMessages()} />
        </StaggerFadeIn>
        <View style={styles.bottomSpacer} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
        <StaggerFadeIn delay={0}>
          <MessagesHero
            totalCount={conversations.length}
            unreadCount={counts.unread}
            awaitingReplyCount={counts.awaitingReply}
            needsReactionCount={counts.needsReaction}
            dateLabel={dateLabel}
          />
          <Text style={styles.heroSubtitle}>{COACH_MESSAGES_INBOX_COPY.heroSubtitle}</Text>
        </StaggerFadeIn>

        <StaggerFadeIn delay={10}>
          <SectionCard elevated style={styles.summaryCard}>
            <Text style={styles.summaryKicker}>Сводка inbox</Text>
            <Text style={styles.summaryPrimary}>{summaryPack.primary}</Text>
            {summaryPack.secondary ? (
              <Text style={styles.summarySecondary}>{summaryPack.secondary}</Text>
            ) : null}
            {conversations.length > 0 && summaryPack.nextStep ? (
              <Text style={styles.summaryNext}>{summaryPack.nextStep}</Text>
            ) : null}
          </SectionCard>
        </StaggerFadeIn>

        <StaggerFadeIn delay={14}>
          <SectionCard elevated style={styles.panelCard}>
            <Text style={styles.panelTitle}>Обзор</Text>
            <MessagesOverview
              unreadCount={counts.unread}
              parentCount={counts.parents}
              teamCount={counts.teams}
              awaitingReplyCount={counts.awaitingReply}
              needsReactionCount={counts.needsReaction}
            />
            <View style={styles.panelDivider} />
            <Text style={styles.panelTitle}>Фильтр</Text>
            <Text style={styles.panelHint}>{COACH_MESSAGES_INBOX_COPY.panelHint}</Text>
            <MessagesFilterSegment value={filter} onChange={setFilter} counts={counts} />
          </SectionCard>
        </StaggerFadeIn>

        {counts.needsReaction > 0 ? (
          <StaggerFadeIn delay={20}>
            <SectionCard elevated style={styles.followUpCard}>
              <Text style={styles.followUpTitle}>{COACH_MESSAGES_INBOX_COPY.followUpTitle}</Text>
              <Text style={styles.followUpText}>{COACH_MESSAGES_INBOX_COPY.followUpText}</Text>
              <PrimaryButton
                animatedPress
                title="Открыть первый такой диалог"
                onPress={() => {
                  if (!firstNeedsReactionConversation) return;
                  router.push(`/conversation/${firstNeedsReactionConversation.id}`);
                }}
                style={styles.followUpBtn}
              />
            </SectionCard>
          </StaggerFadeIn>
        ) : null}

        {showEmpty ? (
          <StaggerFadeIn delay={26}>
            <SectionCard elevated style={styles.emptyCard}>
              <View style={styles.emptyAccent} />
              <Text style={styles.emptyTitle}>
                {isEndpointUnavailable(COACH_ENDPOINTS.MESSAGES)
                  ? 'Модуль сообщений пока не подключён'
                  : filter === 'needsReaction'
                    ? 'Нет диалогов, где нужен ваш ответ'
                    : filter === 'awaitingReply'
                      ? 'Нет диалогов в ожидании родителя'
                      : filter !== 'all'
                        ? 'Ничего под фильтр'
                        : 'Пока нет диалогов'}
              </Text>
              <Text style={styles.emptyText}>
                {isEndpointUnavailable(COACH_ENDPOINTS.MESSAGES)
                  ? 'Когда сервер будет готов, здесь появятся треды.'
                  : filter !== 'all'
                    ? 'Смените фильтр или сбросьте на «все», чтобы увидеть полный список.'
                    : 'Когда родители напишут или появятся командные треды, они отобразятся здесь. Остальной рабочий контур — на главной.'}
              </Text>
              <View style={styles.emptyActions}>
                {isEndpointUnavailable(COACH_ENDPOINTS.MESSAGES) ? (
                  <PrimaryButton
                    animatedPress
                    title="Проверить снова"
                    variant="outline"
                    onPress={() => {
                      clearEndpointUnavailable(COACH_ENDPOINTS.MESSAGES);
                      void fetchMessages();
                    }}
                  />
                ) : (
                  <>
                    {filter !== 'all' ? (
                      <PrimaryButton animatedPress title="Показать все диалоги" onPress={() => setFilter('all')} />
                    ) : null}
                    <PrimaryButton
                      animatedPress
                      title="На главную"
                      variant={filter !== 'all' ? 'outline' : 'primary'}
                      onPress={() => router.push('/(tabs)' as Parameters<typeof router.push>[0])}
                    />
                    {filter === 'all' ? (
                      <PrimaryButton
                        animatedPress
                        title="Требуют внимания"
                        variant="outline"
                        onPress={() => router.push('/actions')}
                      />
                    ) : null}
                  </>
                )}
              </View>
            </SectionCard>
          </StaggerFadeIn>
        ) : (
          <StaggerFadeIn delay={26}>
            <View style={styles.listSection}>
              <Text style={styles.listSectionKicker}>Диалоги</Text>
              <Text style={styles.listSectionHint}>{COACH_MESSAGES_INBOX_COPY.listSectionHint}</Text>
              {displayConversations.map((conv, index) => (
                <View key={conv.id} style={index > 0 ? styles.cardGap : undefined}>
                  <ConversationCard
                    conversation={conv}
                    onPress={() => router.push(`/conversation/${conv.id}`)}
                  />
                </View>
              ))}
            </View>
          </StaggerFadeIn>
        )}

        {!showEmpty && conversations.length > 0 ? (
          <StaggerFadeIn delay={30}>
            <SectionCard elevated style={styles.quickCard}>
              <Text style={styles.quickTitle}>{COACH_MESSAGES_INBOX_COPY.quickTitle}</Text>
              <Text style={styles.quickHint}>{COACH_MESSAGES_INBOX_COPY.quickHint}</Text>
              <View style={styles.quickRow}>
                <PressableFeedback
                  style={styles.quickChip}
                  hapticOnPress
                  onPress={() => router.push('/(tabs)' as Parameters<typeof router.push>[0])}
                >
                  <Text style={styles.quickChipText}>Главная</Text>
                </PressableFeedback>
                <PressableFeedback style={styles.quickChip} hapticOnPress onPress={() => router.push('/actions')}>
                  <Text style={styles.quickChipText}>Задачи</Text>
                </PressableFeedback>
                <PressableFeedback style={styles.quickChip} hapticOnPress onPress={() => router.push('/created')}>
                  <Text style={styles.quickChipText}>Материалы</Text>
                </PressableFeedback>
              </View>
            </SectionCard>
          </StaggerFadeIn>
        ) : null}

        <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  heroSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  summaryKicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.55,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  summaryPrimary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  summarySecondary: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  summaryNext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: theme.spacing.md,
  },
  panelCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  panelTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  panelHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  panelDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
    opacity: 0.85,
  },
  followUpCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  followUpTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  followUpText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  followUpBtn: {
    alignSelf: 'flex-start',
  },
  listSection: {
    marginBottom: theme.spacing.lg,
  },
  listSectionKicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  listSectionHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  cardGap: {
    marginTop: theme.spacing.md,
  },
  quickCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  quickTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  quickHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  quickChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickChipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  emptyCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.textMuted,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  emptyAccent: {
    position: 'absolute',
    top: -18,
    right: -18,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primaryMuted,
    opacity: 0.35,
  },
  emptyTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  emptyActions: {
    gap: theme.spacing.sm,
    alignSelf: 'stretch',
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  errorHeading: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  errorBody: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  errorDetail: {
    ...theme.typography.caption,
    color: theme.colors.error,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  errorHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  errorRetry: {
    alignSelf: 'flex-start',
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
