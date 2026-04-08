/**
 * Визуальная группировка соседних сообщений по времени (без новых полей API).
 */

import type { MessageUi } from '@/services/coachMessagesService';

const DEFAULT_WINDOW_MS = 3 * 60 * 1000;

export function coachMessagesSameTimeGroup(
  prev: MessageUi | undefined,
  curr: MessageUi,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  if (!prev) return false;
  if (prev.isOwn !== curr.isOwn) return false;
  const a = prev.createdAtMs;
  const b = curr.createdAtMs;
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(b - a) <= windowMs;
}
