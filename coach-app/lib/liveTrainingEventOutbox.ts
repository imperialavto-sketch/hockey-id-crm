/**
 * Persistent outbox for Live Training session events when POST fails (offline / transient errors).
 * One queue per sessionId in AsyncStorage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClientMutationId } from "@/lib/liveTrainingClientMutationId";

const PREFIX = "lt_event_outbox_v1:";

export type LiveTrainingEventOutboxBody = {
  /** Идемпотентность POST .../events — тот же id при каждом retry/outbox flush (у старых записей может отсутствовать до первой отправки) */
  clientMutationId?: string;
  rawText: string;
  playerId?: string;
  playerNameRaw?: string;
  category?: string;
  sentiment?: "positive" | "negative" | "neutral";
  confidence?: number | null;
  sourceType?: "manual_stub" | "transcript_segment" | "system";
};

export type LiveTrainingQueuedEvent = {
  localId: string;
  body: LiveTrainingEventOutboxBody;
  enqueuedAt: string;
  attempts: number;
  lastError?: string;
};

type StoredShape = { items: LiveTrainingQueuedEvent[] };

function keyForSession(sessionId: string): string {
  return `${PREFIX}${sessionId}`;
}

function randomLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadLiveTrainingEventOutbox(sessionId: string): Promise<LiveTrainingQueuedEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(keyForSession(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredShape;
    if (!parsed || !Array.isArray(parsed.items)) return [];
    return parsed.items.filter(
      (x) => x && typeof x.localId === "string" && x.body && typeof x.body.rawText === "string"
    );
  } catch {
    return [];
  }
}

export async function saveLiveTrainingEventOutbox(
  sessionId: string,
  items: LiveTrainingQueuedEvent[]
): Promise<void> {
  const payload: StoredShape = { items };
  await AsyncStorage.setItem(keyForSession(sessionId), JSON.stringify(payload));
}

export async function enqueueLiveTrainingEvent(
  sessionId: string,
  body: LiveTrainingEventOutboxBody
): Promise<LiveTrainingQueuedEvent> {
  const normalized: LiveTrainingEventOutboxBody = {
    ...body,
    clientMutationId:
      typeof body.clientMutationId === "string" && body.clientMutationId.trim()
        ? body.clientMutationId.trim()
        : createClientMutationId(),
  };
  const items = await loadLiveTrainingEventOutbox(sessionId);
  const row: LiveTrainingQueuedEvent = {
    localId: randomLocalId(),
    body: normalized,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
  };
  items.push(row);
  await saveLiveTrainingEventOutbox(sessionId, items);
  return row;
}

/**
 * Ключ дедупликации для одного и того же наблюдения в очереди (сессия задаётся отдельно).
 * Используется при повторных попытках POST после 422 ingest-clarify — не плодить дубликаты при плохой сети.
 */
export function liveTrainingEventOutboxObservationDedupKey(body: LiveTrainingEventOutboxBody): string {
  const raw = (body.rawText ?? "").trim();
  const pid = typeof body.playerId === "string" ? body.playerId.trim() : "";
  const st = (body.sourceType ?? "manual_stub").trim() || "manual_stub";
  return `${raw}\u0001${pid}\u0001${st}`;
}

/**
 * Ставит событие в outbox; если уже есть запись с тем же phrase + playerId + sourceType — возвращает её
 * (сохраняется первый `clientMutationId` для идемпотентности flush).
 */
export async function enqueueLiveTrainingEventDedupedByObservationKey(
  sessionId: string,
  body: LiveTrainingEventOutboxBody
): Promise<LiveTrainingQueuedEvent> {
  const normalized: LiveTrainingEventOutboxBody = {
    ...body,
    clientMutationId:
      typeof body.clientMutationId === "string" && body.clientMutationId.trim()
        ? body.clientMutationId.trim()
        : createClientMutationId(),
  };
  const key = liveTrainingEventOutboxObservationDedupKey(normalized);
  const items = await loadLiveTrainingEventOutbox(sessionId);
  const existing = items.find((x) => liveTrainingEventOutboxObservationDedupKey(x.body) === key);
  if (existing) {
    const mid = resolveOutboxBodyClientMutationId(existing.body);
    if (!existing.body.clientMutationId?.trim()) {
      const next = items.map((x) =>
        x.localId === existing.localId ? { ...x, body: { ...x.body, clientMutationId: mid } } : x
      );
      await saveLiveTrainingEventOutbox(sessionId, next);
      return { ...existing, body: { ...existing.body, clientMutationId: mid } };
    }
    return existing;
  }
  const row: LiveTrainingQueuedEvent = {
    localId: randomLocalId(),
    body: normalized,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
  };
  items.push(row);
  await saveLiveTrainingEventOutbox(sessionId, items);
  return row;
}

export async function removeLiveTrainingQueuedEvent(sessionId: string, localId: string): Promise<void> {
  const items = (await loadLiveTrainingEventOutbox(sessionId)).filter((x) => x.localId !== localId);
  await saveLiveTrainingEventOutbox(sessionId, items);
}

export async function updateLiveTrainingQueuedEvent(
  sessionId: string,
  localId: string,
  patch: Partial<Pick<LiveTrainingQueuedEvent, "attempts" | "lastError">>
): Promise<void> {
  const items = await loadLiveTrainingEventOutbox(sessionId);
  const next = items.map((x) => (x.localId === localId ? { ...x, ...patch } : x));
  await saveLiveTrainingEventOutbox(sessionId, next);
}

export async function clearLiveTrainingEventOutbox(sessionId: string): Promise<void> {
  await AsyncStorage.removeItem(keyForSession(sessionId));
}

/** Стабильный id для POST .../events */
export function resolveOutboxBodyClientMutationId(body: LiveTrainingEventOutboxBody): string {
  const t = body.clientMutationId?.trim();
  return t && t.length > 0 ? t : createClientMutationId();
}

/**
 * Гарантирует `clientMutationId` в сохранённой записи очереди (миграция старых элементов без поля).
 */
export async function ensureOutboxItemClientMutationId(
  sessionId: string,
  localId: string
): Promise<string> {
  const items = await loadLiveTrainingEventOutbox(sessionId);
  const item = items.find((x) => x.localId === localId);
  if (!item) return createClientMutationId();
  const existing = item.body.clientMutationId?.trim();
  if (existing) return existing;
  const mid = createClientMutationId();
  const next = items.map((x) =>
    x.localId === localId ? { ...x, body: { ...x.body, clientMutationId: mid } } : x
  );
  await saveLiveTrainingEventOutbox(sessionId, next);
  return mid;
}
