/**
 * Разделители дат в треде coach-app (только presentation).
 */

function startOfLocalDayMs(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function coachThreadDayKey(createdAtMs: number | undefined): string | null {
  if (createdAtMs == null || !Number.isFinite(createdAtMs)) return null;
  const d = new Date(createdAtMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function coachThreadNeedsDaySeparator(
  prevDayKey: string | null,
  currDayKey: string | null
): boolean {
  if (!currDayKey) return false;
  return prevDayKey !== currDayKey;
}

export function coachThreadDaySeparatorLabel(createdAtMs: number, nowMs: number): string | null {
  if (!Number.isFinite(createdAtMs)) return null;
  const d0 = startOfLocalDayMs(createdAtMs);
  const t0 = startOfLocalDayMs(nowMs);
  const diffDays = Math.round((t0 - d0) / 86400000);
  if (diffDays < 0) {
    return new Date(createdAtMs).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  if (diffDays > 1 && diffDays < 7) {
    return new Date(createdAtMs).toLocaleDateString('ru-RU', { weekday: 'long' });
  }
  return new Date(createdAtMs).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: diffDays > 365 ? 'numeric' : undefined,
  });
}
