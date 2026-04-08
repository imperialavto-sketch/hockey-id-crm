/**
 * Avoid double navigation when both cold-start (`getLastNotificationResponseAsync`)
 * and the response listener fire for the same notification tap.
 */

import type { NotificationResponse } from 'expo-notifications';

const DEDUPE_MS = 2500;

let lastKey = '';
let lastAt = 0;

function buildKey(response: NotificationResponse): string {
  const { notification } = response;
  const reqId = notification.request.identifier;
  const date = notification.date;
  const data = notification.request.content.data as Record<string, unknown> | undefined;
  const type = typeof data?.type === 'string' ? data.type : '';
  const conv =
    typeof data?.conversationId === 'string' ? data.conversationId : '';
  return `${reqId}|${date}|${type}|${conv}`;
}

/** @returns true if this response was already handled recently — skip navigation. */
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
