import type { ScheduleItem } from "@/types";
import type { TeamEvent } from "@/types/team";
import { apiFetch } from "@/lib/api";
import { isDemoMode } from "@/config/api";
import { getDemoWeeklySchedule } from "@/demo/demoSchedule";
import { MOCK_TEAM_EVENTS } from "@/constants/mockTeamEvents";

/** Backend response item from GET /api/me/schedule (parent's personal schedule) */
export interface MeScheduleItem {
  id: number | string;
  title: string;
  startTime?: string;
  date?: string;
  location?: string | null;
  teamId?: number | string;
}

function formatDay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function getDisplayDateTime(item: MeScheduleItem): string {
  return (item.startTime ?? item.date ?? "").trim() || "";
}

function mapMeScheduleToItem(s: MeScheduleItem): ScheduleItem {
  const rawStart = getDisplayDateTime(s);
  return {
    id: String(s.id),
    day: formatDay(rawStart),
    title: s.title ?? "",
    time: formatTime(rawStart),
  };
}

function mapMeScheduleToTeamEvent(s: MeScheduleItem): TeamEvent {
  const rawStart = getDisplayDateTime(s);
  const d = new Date(rawStart || 0);
  return {
    id: String(s.id),
    type: "training",
    title: s.title ?? "Событие",
    date: d.toISOString().slice(0, 10),
    time: d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    location: s.location ?? undefined,
  };
}

/**
 * Fetch parent's personal schedule from GET /api/me/schedule.
 * Auth: Bearer token. Backend filters by parent's children.
 * Demo mode: returns demo data.
 */
export async function getMeSchedule(): Promise<ScheduleItem[]> {
  if (isDemoMode) {
    return getDemoWeeklySchedule();
  }
  const data = await apiFetch<MeScheduleItem[]>("/api/me/schedule", { timeoutMs: 6000 });
  if (!Array.isArray(data)) return [];
  return data.map(mapMeScheduleToItem);
}

/** Fetch events for team feed "Ближайшие события". Uses parent's schedule. Demo mode: mock events. */
export async function getTeamEvents(): Promise<TeamEvent[]> {
  if (isDemoMode) {
    return [...MOCK_TEAM_EVENTS];
  }
  const data = await apiFetch<MeScheduleItem[]>("/api/me/schedule", { timeoutMs: 6000 });
  if (!Array.isArray(data)) return [];
  return data.slice(0, 10).map(mapMeScheduleToTeamEvent);
}
