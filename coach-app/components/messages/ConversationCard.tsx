import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';

export type ConversationType = 'parent' | 'team' | 'announcement';

export type ConversationCardData = {
  id: string;
  type: ConversationType;
  name: string;
  metadata?: string;
  preview: string;
  time: string;
  unreadCount?: number;
};

type ConversationCardProps = {
  conversation: ConversationCardData;
  onPress?: () => void;
  onOpenConversation?: () => void;
};

function TypeChip({ type }: { type: ConversationType }) {
  const config =
    type === 'parent'
      ? { label: 'Родитель', bg: theme.colors.primaryMuted, color: theme.colors.primary }
      : type === 'team'
        ? { label: 'Команда', bg: theme.colors.accentMuted, color: theme.colors.accent }
        : { label: 'Объявление', bg: theme.colors.surfaceElevated, color: theme.colors.textSecondary };

  return (
    <View style={[styles.typeChip, { backgroundColor: config.bg }]}>
      <Text style={[styles.typeChipText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

export function ConversationCard({
  conversation,
  onPress,
  onOpenConversation,
}: ConversationCardProps) {
  const hasUnread = (conversation.unreadCount ?? 0) > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <SectionCard elevated style={styles.card}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.initial}>{(conversation.name || '?')[0]}</Text>
          </View>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={[styles.name, hasUnread && styles.nameUnread]}>
                {conversation.name}
              </Text>
              <Text style={styles.time}>{conversation.time}</Text>
            </View>
            {conversation.metadata ? (
              <Text style={styles.metadata}>{conversation.metadata}</Text>
            ) : null}
            <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={2}>
              {conversation.preview}
            </Text>
            <View style={styles.footer}>
              <TypeChip type={conversation.type} />
              {hasUnread ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {conversation.unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <PrimaryButton
          title="Открыть"
          variant={hasUnread ? 'primary' : 'outline'}
          onPress={onOpenConversation ?? onPress}
        />
      </SectionCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    ...theme.typography.subtitle,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  name: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    flex: 1,
  },
  nameUnread: {
    fontWeight: '600',
  },
  time: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  metadata: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  preview: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  previewUnread: {
    color: theme.colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  typeChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  unreadBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.accentMuted,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accent,
  },
});
