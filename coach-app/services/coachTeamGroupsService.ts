/**
 * Team groups MVP — /api/team-groups (список, создание, правка, назначение игрока).
 */

import { apiFetch } from "@/lib/api";
import { getCoachAuthHeaders } from "@/lib/coachAuth";

const BASE = "/api/team-groups";

export interface CoachTeamGroupListItem {
  id: string;
  teamId: string;
  name: string;
  level: number;
  color: string | null;
  playersCount: number;
  createdAt: string;
}

export async function listCoachTeamGroups(
  teamId: string
): Promise<CoachTeamGroupListItem[]> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<CoachTeamGroupListItem[]>(
    `${BASE}?teamId=${encodeURIComponent(teamId)}`,
    { method: "GET", headers }
  );
  return Array.isArray(raw) ? raw : [];
}

export async function createCoachTeamGroup(body: {
  teamId: string;
  name: string;
  level?: number | null;
  color?: string | null;
}): Promise<CoachTeamGroupListItem> {
  const headers = await getCoachAuthHeaders();
  return apiFetch<CoachTeamGroupListItem>(BASE, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export async function updateCoachTeamGroup(
  groupId: string,
  body: { name?: string; level?: number | null; color?: string | null }
): Promise<CoachTeamGroupListItem> {
  const headers = await getCoachAuthHeaders();
  return apiFetch<CoachTeamGroupListItem>(
    `${BASE}/${encodeURIComponent(groupId)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    }
  );
}

export async function assignCoachPlayerToGroup(
  playerId: string,
  groupId: string | null
): Promise<{ ok: boolean; playerId: string; groupId: string | null }> {
  const headers = await getCoachAuthHeaders();
  return apiFetch(`${BASE}/assign-player`, {
    method: "POST",
    headers,
    body: JSON.stringify({ playerId, groupId }),
  });
}
