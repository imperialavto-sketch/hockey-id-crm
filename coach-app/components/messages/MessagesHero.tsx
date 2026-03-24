import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type MessagesHeroProps = {
  totalCount: number;
  unreadCount: number;
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: theme.spacing.xl,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: theme.colors.text,
    lineHeight: 34,
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
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textMuted,
  },
});
