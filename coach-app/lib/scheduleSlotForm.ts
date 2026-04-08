/**
 * Shared date/time parsing for schedule create + quick edit (local calendar day + HH:mm).
 */

import { toLocalDateKey } from "@/lib/scheduleScreenWeek";

export function parseDate(dateStr: string): Date | null {
  const d = new Date(dateStr + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

export function parseTime(timeStr: string): { h: number; m: number } | null {
  const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

export function buildISO(dateStr: string, timeStr: string): string | null {
  const date = parseDate(dateStr);
  const time = parseTime(timeStr);
  if (!date || !time) return null;
  const d = new Date(date);
  d.setHours(time.h, time.m, 0, 0);
  return d.toISOString();
}

/** HH:mm from ISO string in local timezone. */
export function isoToLocalTimeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isoToLocalDateKey(iso: string): string {
  return toLocalDateKey(new Date(iso));
}

export function normalizeScheduleKind(t: string): "ice" | "ofp" {
  const x = t.trim().toLowerCase();
  if (x === "ofp") return "ofp";
  return "ice";
}
