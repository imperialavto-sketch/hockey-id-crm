/**
 * Утилиты для потока сообщений родителя (без API).
 * Порядок: хронологический по `createdAt` — корректный скролл к концу списка.
 */

import type { ChatMessage } from "@/types/chat";

export function sortChatMessagesChronological(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/**
 * Слияние страницы «старее» с уже показанными: без дублей по `id`, затем сортировка по времени.
 */
export function mergeOlderChatPageIntoVisible(
  olderPage: ChatMessage[],
  visible: ChatMessage[]
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of olderPage) byId.set(m.id, m);
  for (const m of visible) byId.set(m.id, m);
  return sortChatMessagesChronological([...byId.values()]);
}

/**
 * Full-thread sync: server list is authoritative for ids present on the server;
 * keep local-only rows (should be rare after send) so nothing disappears mid-flight.
 */
export function mergeChatMessagesPreferServer(
  server: ChatMessage[],
  local: ChatMessage[]
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of server) {
    byId.set(m.id, m);
  }
  for (const m of local) {
    if (!byId.has(m.id)) {
      byId.set(m.id, m);
    }
  }
  return sortChatMessagesChronological([...byId.values()]);
}
