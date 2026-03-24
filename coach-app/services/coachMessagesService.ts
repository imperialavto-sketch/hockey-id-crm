/**
 * Coach Messages API — conversations list, conversation detail.
 * Auth: getCoachAuthHeaders (Bearer; dev without token gets 401).
 * GET /api/coach/messages
 * GET /api/coach/messages/:conversationId
 */

import { apiFetch, isApi404 } from '@/lib/api';
import { getCoachAuthHeaders } from '@/lib/coachAuth';
import { isEndpointUnavailable, markEndpointUnavailable } from '@/lib/endpointAvailability';
import type { ConversationCardData, ConversationType } from '@/components/messages/ConversationCard';

/** API response for conversation list item */
export interface ConversationApiItem {
  id: string;
  title?: string;
  playerId?: string;
  groupName?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  participants?: string[];
  kind?: string;
}

/** API response for conversation detail */
export interface ConversationDetailApiItem {
  id: string;
  title?: string;
  playerId?: string;
  groupName?: string;
  participants?: string[];
  messages?: Array<{
    id: string;
    senderName?: string;
    senderRole?: string;
    text?: string;
    createdAt?: string;
    isOwn?: boolean;
  }>;
}

export interface ConversationDetailUi {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    senderName: string;
    text: string;
    time: string;
    isOwn: boolean;
  }>;
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

function mapKindToType(kind?: string): ConversationType {
  const k = (kind ?? '').toLowerCase();
  if (k === 'parent') return 'parent';
  if (k === 'team' || k === 'group') return 'team';
  if (k === 'announcement') return 'announcement';
  return 'parent';
}

function mapConversationApiToCard(api: ConversationApiItem): ConversationCardData {
  const type = mapKindToType(api.kind);
  const name = api.title ?? 'Диалог';
  let metadata = '';
  if (type === 'team' || type === 'announcement') {
    metadata =
      api.participants && api.participants.length > 0
        ? `${api.groupName ?? 'Группа'} · ${api.participants.length} участников`
        : (api.groupName ?? '');
  } else if (api.groupName) {
    metadata = api.groupName;
  } else if (api.playerId) {
    metadata = '';
  }

  return {
    id: api.id,
    type,
    name,
    metadata: metadata || undefined,
    preview: api.lastMessage ?? '—',
    time: formatTime(api.lastMessageAt),
    unreadCount: api.unreadCount ?? 0,
  };
}

/**
 * Map API conversation detail to UI model.
 */
export function mapConversationDetailToUi(api: ConversationDetailApiItem): ConversationDetailUi {
  const messages = (api.messages ?? [])
    .filter((m) => !!m?.id)
    .map((m) => ({
      id: m.id,
      senderName: m.senderName ?? '—',
      text: m.text ?? '',
      time: formatTime(m.createdAt),
      isOwn: m.isOwn ?? false,
    }));

  return {
    id: api.id,
    title: api.title ?? 'Диалог',
    messages,
  };
}

const MESSAGES_PATH = '/api/coach/messages';

/**
 * Fetch conversations list from API.
 * Returns [] on 404 (endpoint absent). Throws on other errors.
 */
export async function getCoachMessages(): Promise<ConversationCardData[]> {
  if (isEndpointUnavailable(MESSAGES_PATH)) return [];
  try {
    const headers = await getCoachAuthHeaders();
    const raw = await apiFetch<ConversationApiItem[]>(MESSAGES_PATH, {
      method: 'GET',
      headers,
    });
    const items = Array.isArray(raw) ? raw : [];
    return items
      .filter((item): item is ConversationApiItem => !!item?.id)
      .map(mapConversationApiToCard);
  } catch (e) {
    if (isApi404(e)) {
      markEndpointUnavailable(MESSAGES_PATH);
      return [];
    }
    throw e;
  }
}

/** API response for send message */
export interface SendMessageApiResponse {
  id: string;
  senderName?: string;
  senderRole?: string;
  text?: string;
  createdAt?: string;
  isOwn?: boolean;
}

/** UI message format for appending to thread */
export interface MessageUi {
  id: string;
  senderName: string;
  text: string;
  time: string;
  isOwn: boolean;
}

const messagesSendSuffix = '/send';

/**
 * Send a message in a conversation.
 * Returns the new message in UI format, or null on error/404.
 */
export async function sendCoachMessage(
  conversationId: string,
  text: string
): Promise<MessageUi | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const path = `${messagesDetailPrefix}${encodeURIComponent(conversationId)}${messagesSendSuffix}`;
  if (isEndpointUnavailable(path)) return null;
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<SendMessageApiResponse>(path, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: trimmed }),
    });

    if (!res?.id) return null;

    return {
      id: res.id,
      senderName: res.senderName ?? 'Вы',
      text: res.text ?? trimmed,
      time: formatTime(res.createdAt),
      isOwn: res.isOwn ?? true,
    };
  } catch (e) {
    if (isApi404(e)) markEndpointUnavailable(path);
    return null;
  }
}

const messagesDetailPrefix = '/api/coach/messages/';

/**
 * Fetch conversation detail from API.
 * Returns null on error or 404.
 */
export async function getCoachConversation(
  conversationId: string
): Promise<ConversationDetailUi | null> {
  const path = `${messagesDetailPrefix}${encodeURIComponent(conversationId)}`;
  if (isEndpointUnavailable(path)) return null;
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<ConversationDetailApiItem | null>(path, {
      method: 'GET',
      headers,
    });
    if (!res?.id) return null;
    return mapConversationDetailToUi(res);
  } catch (e) {
    if (isApi404(e)) markEndpointUnavailable(path);
    return null;
  }
}
