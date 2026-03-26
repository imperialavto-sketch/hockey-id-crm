import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type MessagesHeroProps = {
  totalCount: number;
  unreadCount: number;
  awaitingReplyCount?: number;
  needsReactionCount?: number;
  dateLabel?: string;
};

function formatContextDate() {
  const d = new Date();
  return d.toLocaleDateString('ru-RU', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function MessagesHero({
  totalCount,
  unreadCount,
  awaitingReplyCount = 0,
  needsReactionCount = 0,
  dateLabel = formatContextDate(),
}: MessagesHeroProps) {
  const countLabel =
    totalCount > 0
      ? `${totalCount} ${totalCount === 1 ? 'диалог' : totalCount < 5 ? 'диалога' : 'диалогов'}`
      : 'Нет диалогов';

  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>Сообщения</Text>
      <Text style={styles.title}>Диалоги</Text>
      <View style={styles.context}>
        <Text style={styles.summary}>{dateLabel}</Text>
        <View style={styles.dot} />
        <Text style={styles.summary}>{countLabel}</Text>
        {unreadCount > 0 && (
          <>
            <View style={styles.dot} />
            <Text style={[styles.summary, styles.unread]}>
              {unreadCount} непрочитанных
            </Text>
          </>
        )}
        {awaitingReplyCount > 0 && (
          <>
            <View style={styles.dot} />
            <Text style={styles.summaryMuted}>
              {awaitingReplyCount === 1
                ? 'Нет ответа в одном диалоге'
                : `Нет ответа в ${awaitingReplyCount} диалогах`}
            </Text>
          </>
        )}
        {needsReactionCount > 0 && (
          <>
            <View style={styles.dot} />
            <Text style={styles.summaryPrimary}>
              {needsReactionCount === 1
                ? 'Есть 1 диалог с ответом родителя'
                : `Есть ${needsReactionCount} диалогов с ответом родителей`}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: theme.layout.heroBottom,
  },
  eyebrow: {
    ...theme.typography.heroEyebrow,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  title: {
    ...theme.typography.hero,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  summary: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  unread: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  summaryMuted: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  summaryPrimary: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
});
