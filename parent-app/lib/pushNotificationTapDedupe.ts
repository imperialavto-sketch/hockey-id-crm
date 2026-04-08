/**
 * Предотвращает двойную навигацию при открытии из пуша:
 * `getLastNotificationResponseAsync` + `addNotificationResponseReceivedListener` могут сработать для одного тапа.
 */

import type { NotificationResponse } from "expo-notifications";

const DEDUPE_MS = 2500;

let lastKey = "";
let lastAt = 0;

function buildKey(response: NotificationResponse): string {
  const { notification } = response;
  const reqId = notification.request.identifier;
  const date = notification.date;
  const data = notification.request.content
    .data as Record<string, unknown> | undefined;
  const type = typeof data?.type === "string" ? data.type : "";
  const conv =
    typeof data?.conversationId === "string" ? data.conversationId : "";
  return `${reqId}|${date}|${type}|${conv}`;
}

/**
 * @returns true если этот ответ уже обработан недавно — навигацию пропускаем.
 */
export function shouldSkipDuplicateNotificationTap(
  response: NotificationResponse
): boolean {
  const key = buildKey(response);
  const now = Date.now();
  if (key && key === lastKey && now - lastAt < DEDUPE_MS) {
    return true;
  }
  lastKey = key;
  lastAt = now;
  return false;
}
