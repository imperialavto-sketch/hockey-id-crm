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
  endTime?: string;
  date?: string;
  location?: string | null;
  teamId?: number | string;
  sessionType?: string;
  sessionSubType?: string | null;
  attendanceStatus?: "present" | "absent" | null;
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

function formatAttendance(s: MeScheduleItem): string | undefined {
  if (!s.sessionType) return undefined;
  if (s.attendanceStatus === "present") return "Был";
  if (s.attendanceStatus === "absent") return "Не был";
  return "Не отмечено";
}

function mapMeScheduleToItem(s: MeScheduleItem): ScheduleItem {
  const rawStart = getDisplayDateTime(s);
  const loc = s.location != null && String(s.location).trim() ? String(s.location).trim() : undefined;
  const att = formatAttendance(s);
  return {
    id: String(s.id),
    day: formatDay(rawStart),
    title: s.title ?? "",
    time: formatTime(rawStart),
    subtitle: loc,
    attendance: att,
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

function buildScheduleQuery(playerId?: string | null, weekStartDate?: string): string {
  const q = new URLSearchParams();
  if (playerId) q.set("playerId", playerId);
  if (weekStartDate) q.set("weekStartDate", weekStartDate);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * Fetch parent's schedule from GET /api/me/schedule.
 * Optional playerId + weekStartDate (YYYY-MM-DD) — расписание группы ребёнка на неделю.
 */
export async function getMeSchedule(
  playerId?: string | null,
  weekStartDate?: string
): Promise<ScheduleItem[]> {
  if (isDemoMode) {
    return getDemoWeeklySchedule();
  }
  const path = `/api/me/schedule${buildScheduleQuery(playerId, weekStartDate)}`;
  const data = await apiFetch<MeScheduleItem[]>(path, { timeoutMs: 6000 });
  if (!Array.isArray(data)) return [];
  return data.map(mapMeScheduleToItem);
}

/** Fetch events for team feed "Ближайшие события". Uses parent's schedule. Demo mode: mock events. */
export async function getTeamEvents(): Promise<TeamEvent[]> {
  if (isDemoMode) {
    return [...MOCK_TEAM_EVENTS];
  }
  const data = await apiFetch<MeScheduleItem[]>(
    "/api/me/schedule",
    { timeoutMs: 6000 }
  );
  if (!Array.isArray(data)) return [];
  return data.slice(0, 10).map(mapMeScheduleToTeamEvent);
}
