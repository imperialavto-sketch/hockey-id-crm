/**
 * Coach Teams API — coach-scoped teams.
 * GET /api/coach/teams
 * GET /api/coach/teams/:id
 */

import { apiFetch } from "@/lib/api";
import { getCoachAuthHeaders } from "@/lib/coachAuth";

export interface CoachTeamItem {
  id: string;
  name: string;
  level: string;
  playerCount: number;
  nextSession?: string;
  venue?: string;
  confirmed: number;
  expected: number;
}

export interface CoachTeamDetail {
  id: string;
  name: string;
  level: string;
  playerCount: number;
  nextSession?: {
    date: string;
    time: string;
    venue: string;
    confirmed: number;
    expected: number;
  };
  attendance: { attended: number; total: number };
  roster: Array<{ id: string; name: string; number: number; position: string }>;
}

const TEAMS_PATH = "/api/coach/teams";

export async function getCoachTeams(): Promise<CoachTeamItem[]> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<CoachTeamItem[]>(TEAMS_PATH, { method: "GET", headers });
  return Array.isArray(raw) ? raw : [];
}

export async function getCoachTeamDetail(
  teamId: string
): Promise<CoachTeamDetail | null> {
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<CoachTeamDetail>(`${TEAMS_PATH}/${encodeURIComponent(teamId)}`, {
      method: "GET",
      headers,
    });
    return res ?? null;
  } catch {
    return null;
  }
}
