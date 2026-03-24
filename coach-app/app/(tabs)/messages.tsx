import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { StaggerFadeIn } from '@/components/dashboard/StaggerFadeIn';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
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
import { getCoachMessages } from '@/services/coachMessagesService';
import { isEndpointUnavailable, clearEndpointUnavailable, COACH_ENDPOINTS } from '@/lib/endpointAvailability';
import { isAuthRequiredError } from '@/lib/coachAuth';
import { theme } from '@/constants/theme';

function filterConversations(
  convos: ConversationCardData[],
  filter: MessagesFilterOption
): ConversationCardData[] {
  if (filter === 'all') return convos;
  if (filter === 'parents') return convos.filter((c) => c.type === 'parent');
  if (filter === 'teams')
    return convos.filter((c) => c.type === 'team' || c.type === 'announcement');
  if (filter === 'unread') return convos.filter((c) => (c.unreadCount ?? 0) > 0);
  return convos;
}

export default function MessagesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<MessagesFilterOption>('all');
  const [conversations, setConversations] = useState<ConversationCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      getCoachMessages()
        .then((data) => {
          setConversations(data);
          setError(null);
        })
        .catch((err) => {
          setConversations([]);
          setError(isAuthRequiredError(err) ? 'Требуется авторизация' : 'Не удалось загрузить сообщения');
        })
        .finally(() => setLoading(false));
    }, [])
  );

  const filteredConversations = useMemo(
    () => filterConversations(conversations, filter),
    [conversations, filter]
  );

  const counts = useMemo(
    () => ({
      all: conversations.length,
      parents: conversations.filter((c) => c.type === 'parent').length,
      teams: conversations.filter(
        (c) => c.type === 'team' || c.type === 'announcement'
      ).length,
      unread: conversations.filter((c) => (c.unreadCount ?? 0) > 0).length,
    }),
    [conversations]
  );

  const unreadCount = counts.unread;
  const parentCount = counts.parents;
  const teamCount = counts.teams;

  const showEmpty = filteredConversations.length === 0;

  if (loading) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Загрузка…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <StaggerFadeIn delay={0}>
          <MessagesHero totalCount={0} unreadCount={0} />
        </StaggerFadeIn>
        <StaggerFadeIn delay={20}>
          <SectionCard elevated style={styles.errorCard}>
            <Text style={styles.errorTitle}>{error}</Text>
            <Text style={styles.errorText}>
              Проверьте соединение и попробуйте снова
            </Text>
            <PrimaryButton
              title="Повторить"
              variant="outline"
              onPress={() => {
                setLoading(true);
                setError(null);
                getCoachMessages()
                  .then((data) => {
                    setConversations(data);
                    setError(null);
                  })
                  .catch((err) => setError(isAuthRequiredError(err) ? 'Требуется авторизация' : 'Не удалось загрузить сообщения'))
                  .finally(() => setLoading(false));
              }}
              style={styles.retryBtn}
            />
          </SectionCard>
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
          unreadCount={unreadCount}
        />
      </StaggerFadeIn>

      <StaggerFadeIn delay={15}>
        <DashboardSection title="Обзор" compact>
          <MessagesOverview
            unreadCount={unreadCount}
            parentCount={parentCount}
            teamCount={teamCount}
          />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={25}>
        <DashboardSection title="Фильтр" compact>
          <MessagesFilterSegment
            value={filter}
            onChange={setFilter}
            counts={counts}
          />
        </DashboardSection>
      </StaggerFadeIn>

      {showEmpty ? (
        <StaggerFadeIn delay={40}>
          <EmptyState
            title={isEndpointUnavailable(COACH_ENDPOINTS.MESSAGES) ? 'Модуль сообщений пока не подключён' : 'Пока нет сообщений'}
            subtitle={isEndpointUnavailable(COACH_ENDPOINTS.MESSAGES) ? 'Когда сервер будет готов, здесь появятся диалоги' : filter !== 'all' ? 'Смените фильтр' : 'Нет диалогов'}
            icon="💬"
            action={
              isEndpointUnavailable(COACH_ENDPOINTS.MESSAGES)
                ? {
                    label: 'Проверить снова',
                    onPress: () => {
                      clearEndpointUnavailable(COACH_ENDPOINTS.MESSAGES);
                      setLoading(true);
                      setError(null);
                      getCoachMessages()
                        .then((data) => {
                          setConversations(data);
                          setError(null);
                        })
                        .catch((err) => setError(isAuthRequiredError(err) ? 'Требуется авторизация' : 'Не удалось загрузить сообщения'))
                        .finally(() => setLoading(false));
                    },
                  }
                : filter !== 'all'
                  ? { label: 'Показать все', onPress: () => setFilter('all') }
                  : undefined
            }
          />
        </StaggerFadeIn>
      ) : (
        <StaggerFadeIn delay={40}>
          <DashboardSection title="Диалоги">
            {filteredConversations.map((conv, index) => (
              <StaggerFadeIn key={conv.id} delay={55 + index * 25}>
                <ConversationCard
                  conversation={conv}
                  onPress={() => router.push(`/conversation/${conv.id}`)}
                  onOpenConversation={() => router.push(`/conversation/${conv.id}`)}
                />
              </StaggerFadeIn>
            ))}
          </DashboardSection>
        </StaggerFadeIn>
      )}

      <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  loading: {
    flexGrow: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  errorTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  retryBtn: {
    alignSelf: 'flex-start',
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
