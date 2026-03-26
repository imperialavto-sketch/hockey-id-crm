/**
 * Week boundaries for schedule MVP — Monday 00:00 UTC through +7 days.
 */

export function parseDateParamUTC(dateStr: string): Date | null {
  const d = new Date(dateStr.trim() + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toWeekStartUTC(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export function weekRangeFromParam(weekStartDateStr: string): {
  rangeStart: Date;
  rangeEnd: Date;
} | null {
  const parsed = parseDateParamUTC(weekStartDateStr);
  if (!parsed) return null;
  const rangeStart = toWeekStartUTC(parsed);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 7);
  return { rangeStart, rangeEnd };
}

/**
 * Нормализует произвольную дату YYYY-MM-DD к понедельнику той же ISO-недели (UTC),
 * возвращает YYYY-MM-DD. Совпадает с тем, как API строит weekRangeFromParam.
 */
export function normalizeWeekStartDateParam(dateStr: string): string | null {
  const parsed = parseDateParamUTC(dateStr.trim());
  if (!parsed) return null;
  const mon = toWeekStartUTC(parsed);
  const y = mon.getUTCFullYear();
  const m = String(mon.getUTCMonth() + 1).padStart(2, "0");
  const d = String(mon.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
