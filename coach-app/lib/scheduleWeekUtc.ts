/**
 * Нормализация недели — зеркало логики `src/lib/schedule-week.ts` на сервере.
 * Параметр weekStartDate в API: YYYY-MM-DD понедельника после toWeekStartUTC(parseDateParamUTC(...)).
 */

function parseDateParamUTC(dateStr: string): Date | null {
  const d = new Date(dateStr.trim() + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

function toWeekStartUTC(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export function normalizeWeekStartDateParam(dateStr: string): string | null {
  const parsed = parseDateParamUTC(dateStr.trim());
  if (!parsed) return null;
  const mon = toWeekStartUTC(parsed);
  const y = mon.getUTCFullYear();
  const m = String(mon.getUTCMonth() + 1).padStart(2, "0");
  const day = String(mon.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Локальный календарный понедельник (00:00 локально) → ключ недели для API.
 */
export function weekStartParamFromLocalMonday(localMonday: Date): string {
  const y = localMonday.getFullYear();
  const m = String(localMonday.getMonth() + 1).padStart(2, "0");
  const d = String(localMonday.getDate()).padStart(2, "0");
  const key = `${y}-${m}-${d}`;
  return normalizeWeekStartDateParam(key) ?? key;
}
