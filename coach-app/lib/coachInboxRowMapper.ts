import type { ConversationCardData, ConversationType } from '@/components/messages/ConversationCard';
import { MESSENGER_KIND } from '@/constants/messengerKinds';
import { formatTeamParentChannelListPreview } from '@/lib/coachInboxListFormat';
import type { CoachInboxListApiItem } from '@/types/coachInboxApi';

const INBOX_PREVIEW_MAX_CHARS = 118;

function softTruncatePreview(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars - 1).trimEnd();
  return `${cut}…`;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Сейчас';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function resolveCoachInboxRowType(api: CoachInboxListApiItem): ConversationType {
  if (
    api.type === 'team_parent_channel' ||
    api.conversationKind === MESSENGER_KIND.TEAM_PARENT_CHANNEL
  ) {
    return 'team';
  }
  const legacy = (api.kind ?? '').toLowerCase();
  if (legacy === 'team' || legacy === 'group') return 'team';
  if (legacy === 'announcement') return 'announcement';
  return 'parent';
}

/**
 * Превью для карточки: сервер может прислать `preview`; иначе собираем по правилам типа.
 */
export function resolveCoachInboxListPreview(
  api: CoachInboxListApiItem,
  type: ConversationType
): string {
  const fromApi = (api.preview ?? '').trim();
  const raw = fromApi
    ? fromApi
    : type === 'team' || type === 'announcement'
      ? formatTeamParentChannelListPreview(api.lastSenderLabel, api.lastMessage)
      : (api.lastMessage ?? '').trim() || '—';
  return softTruncatePreview(raw, INBOX_PREVIEW_MAX_CHARS);
}

export function mapCoachInboxApiItemToCard(
  api: CoachInboxListApiItem,
  type: ConversationType,
  awaitingParentReply: boolean,
  needsCoachReaction: boolean
): ConversationCardData {
  const name = api.title ?? 'Диалог';
  let metadata = '';
  if (type === 'team' || type === 'announcement') {
    const g = (api.groupName ?? '').trim();
    const n = api.participants?.length ?? 0;
    if (g && n > 0) metadata = `${g} · ${n}`;
    else if (g) metadata = g;
    else if (n > 0) metadata = `${n} чел.`;
  } else if (api.groupName) {
    metadata = (api.groupName ?? '').trim();
  }

  const nameTrim = name.trim();
  if (metadata && nameTrim && metadata.trim() === nameTrim) {
    metadata = '';
  }

  return {
    id: api.id,
    type,
    name,
    playerId: api.playerId,
    metadata: metadata || undefined,
    preview: resolveCoachInboxListPreview(api, type),
    time: formatTime(api.lastMessageAt),
    unreadCount: api.unreadCount ?? 0,
    awaitingParentReply,
    needsCoachReaction,
  };
}
