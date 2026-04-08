/**
 * Локальная «память» действий, созданных во время текущей live-сессии (in-memory, без backend).
 */

export type LiveTrainingInSessionCapturedActionKind = "player" | "team";

export type LiveTrainingInSessionCapturedAction = {
  kind: LiveTrainingInSessionCapturedActionKind;
  title: string;
  playerId?: string;
  dedupeKey: string;
  createdAt: string;
  actionItemId?: string;
};

export const LIVE_TRAINING_IN_SESSION_ACTION_MEMORY_PREVIEW_MAX = 3;

export function appendCapturedSessionAction(
  prev: LiveTrainingInSessionCapturedAction[],
  entry: Omit<LiveTrainingInSessionCapturedAction, "createdAt"> & { createdAt?: string }
): LiveTrainingInSessionCapturedAction[] {
  if (prev.some((x) => x.dedupeKey === entry.dedupeKey)) return prev;
  const row: LiveTrainingInSessionCapturedAction = {
    kind: entry.kind,
    title: entry.title,
    playerId: entry.playerId,
    dedupeKey: entry.dedupeKey,
    actionItemId: entry.actionItemId,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
  return [...prev, row];
}

export type LiveTrainingInSessionActionMemoryView = {
  /** Последние по времени, максимум previewMax */
  preview: LiveTrainingInSessionCapturedAction[];
  /** Сколько записей скрыто за пределами preview */
  moreCount: number;
};

/**
 * Новые сверху; preview — первые previewMax после сортировки по убыванию createdAt.
 */
export function buildInSessionActionMemoryView(
  items: LiveTrainingInSessionCapturedAction[],
  previewMax: number = LIVE_TRAINING_IN_SESSION_ACTION_MEMORY_PREVIEW_MAX
): LiveTrainingInSessionActionMemoryView {
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const preview = sorted.slice(0, previewMax);
  const moreCount = Math.max(0, sorted.length - previewMax);
  return { preview, moreCount };
}

export function clipMemoryTitle(title: string, maxLen: number = 56): string {
  const t = title.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}
