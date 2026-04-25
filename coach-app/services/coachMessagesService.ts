/**
 * Coach Messages API — conversations list, conversation detail.
 * Auth: getCoachAuthHeaders (Bearer; dev without token gets 401).
 * GET /api/coach/messages
 * GET /api/coach/messages/:conversationId
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, isApi404 } from '@/lib/api';
import { getCoachAuthHeaders } from '@/lib/coachAuth';
import { isEndpointUnavailable, markEndpointUnavailable } from '@/lib/endpointAvailability';
import type { ConversationCardData, ConversationType } from '@/components/messages/ConversationCard';

const AWAITING_REPLY_STORAGE_KEY = '@coach_conversation_awaiting_reply_v1';
/** ms: if thread lastMessageAt moved past this after our send, treat as possible parent reply */
const AWAITING_REPLY_CLEAR_SLACK_MS = 2_000;

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
  /** When API provides it: last list message was sent by current coach */
  lastMessageIsOwn?: boolean;
  /** e.g. coach | parent — when API provides it */
  lastMessageSenderRole?: string;
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

type AwaitingReplyMap = Record<string, string>;

async function loadAwaitingReplyMap(): Promise<AwaitingReplyMap> {
  try {
    const raw = await AsyncStorage.getItem(AWAITING_REPLY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as AwaitingReplyMap;
  } catch {
    return {};
  }
}

async function saveAwaitingReplyMap(map: AwaitingReplyMap): Promise<void> {
  try {
    await AsyncStorage.setItem(AWAITING_REPLY_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function lastMessageAppearsFromCoach(api: ConversationApiItem): boolean {
  const role = (api.lastMessageSenderRole ?? '').toLowerCase().trim();
  if (api.lastMessageIsOwn === true) return true;
  if (role === 'coach' || role === 'trainer' || role === 'main_coach') return true;
  return false;
}

function lastMessageAppearsFromParent(api: ConversationApiItem): boolean {
  const role = (api.lastMessageSenderRole ?? '').toLowerCase().trim();
  if (api.lastMessageIsOwn === false) return true;
  if (role === 'parent' || role === 'guardian') return true;
  return false;
}

/**
 * Parent dialogues where the last message looks like it was from the coach:
 * we surface "waiting for parent" without claiming certainty when API omits sender hints.
 */
function computeAwaitingParentReply(
  api: ConversationApiItem,
  type: ConversationType,
  markedAtIso: string | undefined
): { awaiting: boolean; clearMarked: boolean } {
  if (type !== 'parent') return { awaiting: false, clearMarked: false };

  if ((api.unreadCount ?? 0) > 0) {
    return { awaiting: false, clearMarked: !!markedAtIso };
  }

  const hasLast = !!(api.lastMessage && String(api.lastMessage).trim());

  if (lastMessageAppearsFromParent(api)) {
    return { awaiting: false, clearMarked: !!markedAtIso };
  }

  if (hasLast && lastMessageAppearsFromCoach(api)) {
    return { awaiting: true, clearMarked: false };
  }

  if (markedAtIso) {
    const marked = new Date(markedAtIso).getTime();
    const lastAt = api.lastMessageAt ? new Date(api.lastMessageAt).getTime() : 0;
    if (lastAt > marked + AWAITING_REPLY_CLEAR_SLACK_MS) {
      return { awaiting: false, clearMarked: true };
    }
    return { awaiting: true, clearMarked: false };
  }

  return { awaiting: false, clearMarked: false };
}

function computeNeedsCoachReaction(
  api: ConversationApiItem,
  type: ConversationType
): boolean {
  if (type !== 'parent') return false;
  if ((api.unreadCount ?? 0) <= 0) return false;
  if (lastMessageAppearsFromCoach(api)) return false;
  return true;
}

function mapConversationApiToCard(
  api: ConversationApiItem,
  type: ConversationType,
  awaitingParentReply: boolean,
  needsCoachReaction: boolean
): ConversationCardData {
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
    playerId: api.playerId,
    metadata: metadata || undefined,
    preview: api.lastMessage ?? '—',
    time: formatTime(api.lastMessageAt),
    unreadCount: api.unreadCount ?? 0,
    awaitingParentReply,
    needsCoachReaction,
  };
}

/**
 * Map API conversation detail to UI model.
 */
export function mapConversationDetailToUi(api: ConversationDetailApiItem): ConversationDetailUi {
  const messages = (api.messages ?? [])
    .filter((m) => !!m?.id)
    .map((m) => {
      const createdAtMs =
        typeof m.createdAt === 'string' && m.createdAt
          ? new Date(m.createdAt).getTime()
          : undefined;
      return {
        id: m.id,
        senderName: m.senderName ?? '—',
        text: m.text ?? '',
        time: formatTime(m.createdAt),
        isOwn: m.isOwn ?? false,
        ...(Number.isFinite(createdAtMs) ? { createdAtMs } : {}),
      };
    });

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
    const awaitingMap = await loadAwaitingReplyMap();
    const nextAwaiting: AwaitingReplyMap = { ...awaitingMap };

    const headers = await getCoachAuthHeaders();
    const raw = await apiFetch<ConversationApiItem[]>(MESSAGES_PATH, {
      method: 'GET',
      headers,
    });
    const items = Array.isArray(raw) ? raw : [];
    const cards: ConversationCardData[] = [];

    for (const item of items.filter((i): i is ConversationApiItem => !!i?.id)) {
      const type = mapKindToType(item.kind);
      if (type !== 'parent') {
        delete nextAwaiting[item.id];
      }
      const marked = nextAwaiting[item.id];
      const { awaiting, clearMarked } = computeAwaitingParentReply(item, type, marked);
      const needsCoachReaction = computeNeedsCoachReaction(item, type);
      if (clearMarked) delete nextAwaiting[item.id];
      cards.push(
        mapConversationApiToCard(
          item,
          type,
          needsCoachReaction ? false : awaiting,
          needsCoachReaction
        )
      );
    }

    await saveAwaitingReplyMap(nextAwaiting);
    return cards;
  } catch (e) {
    if (isApi404(e)) {
      markEndpointUnavailable(MESSAGES_PATH);
      return [];
    }
    throw e;
  }
}

/** Sum of `unreadCount` across coach conversations (for app icon badge). */
export async function getCoachChatUnreadBadgeCount(): Promise<number> {
  try {
    const items = await getCoachMessages();
    let n = 0;
    for (const c of items) {
      n += c.unreadCount ?? 0;
    }
    return n;
  } catch {
    return 0;
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
  /** For grouping adjacent bubbles by time window. */
  createdAtMs?: number;
}

export interface ConversationDetailUi {
  id: string;
  title: string;
  messages: MessageUi[];
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

    const createdIso =
      typeof res.createdAt === 'string' && res.createdAt
        ? res.createdAt
        : new Date().toISOString();
    const awaitingMap = await loadAwaitingReplyMap();
    awaitingMap[conversationId] = createdIso;
    await saveAwaitingReplyMap(awaitingMap);

    const createdAtMs = new Date(createdIso).getTime();

    return {
      id: res.id,
      senderName: res.senderName ?? 'Вы',
      text: res.text ?? trimmed,
      time: formatTime(res.createdAt),
      isOwn: res.isOwn ?? true,
      createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : undefined,
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
