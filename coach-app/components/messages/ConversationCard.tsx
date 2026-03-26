import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '@/components/ui/SectionCard';
import { PressableFeedback } from '@/components/ui/PressableFeedback';
import { theme } from '@/constants/theme';

export type ConversationType = 'parent' | 'team' | 'announcement';

export type ConversationCardData = {
  id: string;
  type: ConversationType;
  name: string;
  playerId?: string;
  metadata?: string;
  preview: string;
  time: string;
  unreadCount?: number;
  /** Client-side hint: parent chat, last turn likely ours — ждём ответа */
  awaitingParentReply?: boolean;
  /** Client-side hint: parent likely replied and coach should review */
  needsCoachReaction?: boolean;
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
  onOpenConversation: _onOpenConversation,
}: ConversationCardProps) {
  const unread = conversation.unreadCount ?? 0;
  const hasUnread = unread > 0;
  const needsCoachReaction = conversation.needsCoachReaction === true;
  const awaitingReply = conversation.awaitingParentReply === true;

  const accentStyle = needsCoachReaction
    ? styles.accentNeedsReply
    : hasUnread
      ? styles.accentUnread
      : awaitingReply
        ? styles.accentAwaiting
        : styles.accentDefault;

  const avatarRing =
    conversation.type === 'parent'
      ? styles.avatarRingParent
      : conversation.type === 'team'
        ? styles.avatarRingTeam
        : styles.avatarRingAnnouncement;

  const previewText =
    conversation.preview?.trim() || 'Нет превью — откройте диалог, чтобы увидеть последние сообщения.';

  return (
    <PressableFeedback style={styles.pressable} onPress={onPress}>
      <SectionCard elevated style={styles.card}>
        <View style={styles.cardInner}>
          <View style={[styles.accentBar, accentStyle]} />
          <View style={styles.mainColumn}>
            <View style={styles.topRow}>
              <View style={[styles.avatar, avatarRing]}>
                <Text style={styles.initial}>{(conversation.name || '?').trim().charAt(0) || '?'}</Text>
              </View>
              <View style={styles.textBlock}>
                <View style={styles.nameTimeRow}>
                  <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={2}>
                    {conversation.name || 'Без названия'}
                  </Text>
                  <Text style={styles.time} numberOfLines={1}>
                    {conversation.time || '—'}
                  </Text>
                </View>
                {conversation.metadata ? (
                  <Text style={styles.metadata} numberOfLines={3}>
                    {conversation.metadata}
                  </Text>
                ) : null}

                <View style={styles.signalRow}>
                  {needsCoachReaction ? (
                    <View style={styles.signalSoft}>
                      <View style={styles.signalDotPrimary} />
                      <Text style={styles.signalSoftTextPrimary} numberOfLines={1}>
                        Есть входящее — стоит ответить
                      </Text>
                    </View>
                  ) : null}
                  {hasUnread ? (
                    <View style={styles.unreadPill}>
                      <Text style={styles.unreadPillText}>
                        {unread === 1 ? '1 новое' : `${unread} новых`}
                      </Text>
                    </View>
                  ) : null}
                  {!needsCoachReaction && awaitingReply ? (
                    <View style={styles.signalSoft}>
                      <View style={styles.signalDotMuted} />
                      <Text style={styles.signalSoftTextMuted} numberOfLines={1}>
                        Ждём ответ родителя
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={3}>
                  {previewText}
                </Text>

                <View style={styles.footer}>
                  <TypeChip type={conversation.type} />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </View>
          </View>
        </View>
      </SectionCard>
    </PressableFeedback>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: theme.borderRadius.lg,
  },
  card: {
    marginBottom: 0,
    borderLeftWidth: 0,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  accentBar: {
    width: 4,
    borderRadius: 2,
    marginRight: theme.spacing.sm,
    alignSelf: 'stretch',
    minHeight: 56,
  },
  accentDefault: {
    backgroundColor: theme.colors.border,
  },
  accentNeedsReply: {
    backgroundColor: theme.colors.primary,
    opacity: 0.85,
  },
  accentUnread: {
    backgroundColor: theme.colors.accent,
    opacity: 0.65,
  },
  accentAwaiting: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.45,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarRingParent: {
    borderColor: theme.colors.primaryMuted,
  },
  avatarRingTeam: {
    borderColor: theme.colors.accentMuted,
  },
  avatarRingAnnouncement: {
    borderColor: theme.colors.border,
  },
  initial: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  nameTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  time: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textMuted,
    flexShrink: 0,
    maxWidth: '36%',
    textAlign: 'right',
    marginTop: 2,
  },
  name: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    lineHeight: 22,
    flex: 1,
    minWidth: 0,
  },
  nameUnread: {
    fontWeight: '700',
  },
  metadata: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  signalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  signalSoft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  signalDotPrimary: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    opacity: 0.9,
  },
  signalDotMuted: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.textMuted,
  },
  signalSoftTextPrimary: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  signalSoftTextMuted: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textMuted,
    flexShrink: 1,
  },
  unreadPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  unreadPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  preview: {
    ...theme.typography.caption,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginBottom: theme.spacing.md,
  },
  previewUnread: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  typeChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
});
