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
