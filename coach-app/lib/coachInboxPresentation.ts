/**
 * UI-модель строки coach inbox (без изменения API).
 * Приоритет сигналов: needsCoachReaction > unread > awaiting parent > normal.
 */

import type { ConversationCardData, ConversationType } from '@/components/messages/ConversationCard';

export type CoachInboxChannelPresentation = 'direct' | 'team';

/** Визуальная линия строки: direct / team / announcement (без смены данных API). */
export type CoachInboxVisualLane = 'direct' | 'team' | 'announcement';

export type CoachInboxPriorityPresentation =
  | 'needs_reply'
  | 'unread_only'
  | 'awaiting_parent'
  | 'normal';

export function coachInboxChannelPresentation(
  type: ConversationType
): CoachInboxChannelPresentation {
  return type === 'team' || type === 'announcement' ? 'team' : 'direct';
}

export function coachInboxVisualLane(type: ConversationType): CoachInboxVisualLane {
  if (type === 'announcement') return 'announcement';
  if (type === 'team') return 'team';
  return 'direct';
}

export function coachInboxPriorityPresentation(
  row: ConversationCardData
): CoachInboxPriorityPresentation {
  if (row.needsCoachReaction === true) return 'needs_reply';
  if ((row.unreadCount ?? 0) > 0) return 'unread_only';
  if (row.awaitingParentReply === true) return 'awaiting_parent';
  return 'normal';
}

/** Секция «Требует внимания»: ответ тренеру или непрочитанное от родителя. */
export function isCoachInboxAttentionRow(row: ConversationCardData): boolean {
  return row.needsCoachReaction === true || (row.unreadCount ?? 0) > 0;
}

/**
 * Первые `limit` строк в секции внимания с needsCoachReaction — для усиленного сканирования (только UI).
 */
export function coachInboxTopScanPriorityIds(
  attentionRows: ConversationCardData[],
  limit = 2
): Set<string> {
  const ids: string[] = [];
  for (const row of attentionRows) {
    if (row.needsCoachReaction === true && ids.length < limit) {
      ids.push(row.id);
    }
  }
  return new Set(ids);
}
