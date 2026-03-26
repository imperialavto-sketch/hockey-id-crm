/** In-memory rate limit for POST /api/chat/ai/message (10 req / minute per key). */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

export function checkAiMessageRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) {
    return false;
  }
  entry.count += 1;
  return true;
}
