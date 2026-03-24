/**
 * Coach Schedule API — schedule MVP.
 * GET /api/schedule
 * GET /api/groups
 * POST /api/coach/schedule
 */

import { apiFetch } from "@/lib/api";
import { getCoachAuthHeaders } from "@/lib/coachAuth";

export interface ScheduleItem {
  id: string;
  teamId: string;
  groupId: string;
  group: { id: string; name: string; level: string };
  coachId: string;
  coach: { id: string; firstName: string; lastName: string };
  type: string;
  startAt: string;
  endAt: string;
  locationName: string | null;
  locationAddress: string | null;
  notes: string | null;
  status: string;
  sessionStatus: string;
}

export interface TeamGroup {
  id: string;
  name: string;
  level: number;
  teamId: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateTrainingPayload {
  teamId: string;
  groupId: string;
  type: "hockey" | "ofp" | "game" | "individual";
  startAt: string; // ISO
  endAt: string;   // ISO
  locationName?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
}

const SCHEDULE_PATH = "/api/schedule";
const GROUPS_PATH = "/api/groups";
const COACH_SCHEDULE_PATH = "/api/coach/schedule";

export async function getSchedule(date: string, teamId?: string): Promise<ScheduleItem[]> {
  const params = new URLSearchParams({ date });
  if (teamId) params.set("teamId", teamId);
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<ScheduleItem[]>(
    `${SCHEDULE_PATH}?${params.toString()}`,
    { method: "GET", headers }
  );
  return Array.isArray(raw) ? raw : [];
}

/** Weekly planning: fetch sessions for 7 days (Mon–Sun). weekStartDate = Monday YYYY-MM-DD. */
export async function getScheduleForWeek(
  weekStartDate: string,
  teamId?: string
): Promise<ScheduleItem[]> {
  const params = new URLSearchParams({ weekStartDate });
  if (teamId) params.set("teamId", teamId);
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<ScheduleItem[]>(
    `${SCHEDULE_PATH}?${params.toString()}`,
    { method: "GET", headers }
  );
  return Array.isArray(raw) ? raw : [];
}

export async function getGroups(teamId: string): Promise<TeamGroup[]> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<TeamGroup[]>(
    `${GROUPS_PATH}?teamId=${encodeURIComponent(teamId)}`,
    { method: "GET", headers }
  );
  return Array.isArray(raw) ? raw : [];
}

export async function createTraining(
  payload: CreateTrainingPayload
): Promise<ScheduleItem> {
  const headers = await getCoachAuthHeaders();
  const res = await apiFetch<ScheduleItem>(COACH_SCHEDULE_PATH, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return res;
}
