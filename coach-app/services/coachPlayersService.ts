/**
 * Coach Players API — coach-scoped players.
 * GET /api/coach/players
 * GET /api/coach/players/:id
 */

import { apiFetch } from "@/lib/api";
import { getCoachAuthHeaders } from "@/lib/coachAuth";

export interface CoachPlayerItem {
  id: string;
  name: string;
  number: number;
  position: string;
  team: string;
  teamId: string | null;
  /** Team age group (e.g. U12, U14) for filtering. */
  teamAgeGroup?: string | null;
  attendance?: string;
  coachNote?: string;
}

export interface CoachPlayerDetail {
  id: string;
  name: string;
  number: number;
  position: string;
  team: string;
  teamId: string | null;
  level: string;
  attendance: { attended: number; total: number; lastSession?: string };
}

const PLAYERS_PATH = "/api/coach/players";

export async function getCoachPlayers(teamId?: string): Promise<CoachPlayerItem[]> {
  const headers = await getCoachAuthHeaders();
  const url = teamId
    ? `${PLAYERS_PATH}?teamId=${encodeURIComponent(teamId)}`
    : PLAYERS_PATH;
  const raw = await apiFetch<CoachPlayerItem[]>(url, { method: "GET", headers });
  return Array.isArray(raw) ? raw : [];
}

export async function getCoachPlayerDetail(
  playerId: string
): Promise<CoachPlayerDetail | null> {
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<CoachPlayerDetail>(
      `${PLAYERS_PATH}/${encodeURIComponent(playerId)}`,
      { method: "GET", headers }
    );
    return res ?? null;
  } catch {
    return null;
  }
}

/** GET /api/players/:id/attendance-summary — период по календарным дням UTC (YYYY-MM-DD). */
export interface PlayerAttendanceSummary {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

function formatYmdUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Последние `days` календарных дней до сегодня (UTC). */
export function getAttendanceSummaryRangeDays(days: number): {
  fromDate: string;
  toDate: string;
} {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);
  return { fromDate: formatYmdUTC(from), toDate: formatYmdUTC(to) };
}

export async function getPlayerAttendanceSummary(
  playerId: string,
  fromDate: string,
  toDate: string
): Promise<PlayerAttendanceSummary | null> {
  try {
    const headers = await getCoachAuthHeaders();
    const qs = new URLSearchParams({ fromDate, toDate });
    return await apiFetch<PlayerAttendanceSummary>(
      `/api/players/${encodeURIComponent(playerId)}/attendance-summary?${qs.toString()}`,
      { method: "GET", headers }
    );
  } catch {
    return null;
  }
}
