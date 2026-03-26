/**
 * Coach schedule — TrainingSession only.
 * Weekly: GET /api/coach/schedule?weekStartDate=&teamId=
 * Create: POST /api/coach/schedule
 * Detail: GET /api/trainings/:id
 *
 * Оценки и отчёт: GET/POST /api/trainings/:id/evaluations, GET/POST .../report.
 * Base URL задаётся EXPO_PUBLIC_API_URL (lib/config.ts); маршруты должны быть на том же origin.
 */

import type { CoachTrainingSession } from "@/types/trainingSession";
import { apiFetch } from "@/lib/api";
import { getCoachAuthHeaders } from "@/lib/coachAuth";

export type { CoachTrainingSession };

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
  /** Лёд или ОФП */
  type: "ice" | "ofp";
  subType?: string | null;
  startAt: string;
  endAt: string;
  locationName?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
}

const COACH_SCHEDULE_PATH = "/api/coach/schedule";
const GROUPS_PATH = "/api/groups";
const TRAINING_BY_ID_PATH = "/api/trainings";

export async function getCoachScheduleWeek(
  weekStartDate: string,
  teamId?: string
): Promise<CoachTrainingSession[]> {
  const params = new URLSearchParams({ weekStartDate });
  if (teamId) params.set("teamId", teamId);
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<CoachTrainingSession[]>(
    `${COACH_SCHEDULE_PATH}?${params.toString()}`,
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
): Promise<CoachTrainingSession> {
  const headers = await getCoachAuthHeaders();
  return apiFetch<CoachTrainingSession>(COACH_SCHEDULE_PATH, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

export async function getTrainingSessionById(
  id: string
): Promise<CoachTrainingSession> {
  const headers = await getCoachAuthHeaders();
  return apiFetch<CoachTrainingSession>(
    `${TRAINING_BY_ID_PATH}/${encodeURIComponent(id)}`,
    { method: "GET", headers }
  );
}

export interface TrainingAttendancePlayer {
  playerId: string;
  name: string;
  status: "present" | "absent" | null;
}

export async function getTrainingSessionAttendance(
  sessionId: string
): Promise<TrainingAttendancePlayer[]> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<{ players: TrainingAttendancePlayer[] }>(
    `${TRAINING_BY_ID_PATH}/${encodeURIComponent(sessionId)}/attendance`,
    { method: "GET", headers }
  );
  return Array.isArray(raw?.players) ? raw.players : [];
}

export async function setTrainingSessionAttendance(
  sessionId: string,
  playerId: string,
  status: "present" | "absent"
): Promise<void> {
  const headers = await getCoachAuthHeaders();
  await apiFetch(`${TRAINING_BY_ID_PATH}/${encodeURIComponent(sessionId)}/attendance`, {
    method: "POST",
    headers,
    body: JSON.stringify({ playerId, status }),
  });
}

export interface BulkAttendanceResult {
  updatedCount: number;
  players: TrainingAttendancePlayer[];
}

export async function bulkSetTrainingSessionAttendance(
  sessionId: string,
  status: "present" | "absent"
): Promise<BulkAttendanceResult> {
  const headers = await getCoachAuthHeaders();
  return apiFetch<BulkAttendanceResult>(
    `${TRAINING_BY_ID_PATH}/${encodeURIComponent(sessionId)}/attendance/bulk`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ status }),
    }
  );
}

/** Оценка игрока на тренировке (GET /api/trainings/:id/evaluations). */
export interface TrainingEvaluation {
  playerId: string;
  name: string;
  evaluation: {
    effort?: number;
    focus?: number;
    discipline?: number;
    note?: string;
  } | null;
}

export interface TrainingEvaluationsResponse {
  players: TrainingEvaluation[];
}

export async function getTrainingEvaluations(
  trainingId: string
): Promise<TrainingEvaluation[]> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<TrainingEvaluationsResponse>(
    `${TRAINING_BY_ID_PATH}/${encodeURIComponent(trainingId)}/evaluations`,
    { method: "GET", headers }
  );
  return Array.isArray(raw?.players) ? raw.players : [];
}

export interface SetTrainingEvaluationPayload {
  playerId: string;
  effort?: number;
  focus?: number;
  discipline?: number;
  note?: string;
}

export async function setTrainingEvaluation(
  trainingId: string,
  data: SetTrainingEvaluationPayload
): Promise<void> {
  const headers = await getCoachAuthHeaders();
  await apiFetch(
    `${TRAINING_BY_ID_PATH}/${encodeURIComponent(trainingId)}/evaluations`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    }
  );
}

/** Отчёт по тренировке (GET/POST /api/trainings/:id/report). */
export interface TrainingSessionReportDto {
  trainingId: string;
  summary: string | null;
  focusAreas: string | null;
  coachNote: string | null;
  parentMessage: string | null;
  updatedAt: string | null;
}

export async function getTrainingReport(
  trainingId: string
): Promise<TrainingSessionReportDto> {
  const headers = await getCoachAuthHeaders();
  return apiFetch<TrainingSessionReportDto>(
    `${TRAINING_BY_ID_PATH}/${encodeURIComponent(trainingId)}/report`,
    { method: "GET", headers }
  );
}

export interface SetTrainingReportPayload {
  summary?: string | null;
  focusAreas?: string | null;
  coachNote?: string | null;
  parentMessage?: string | null;
}

export async function setTrainingReport(
  trainingId: string,
  data: SetTrainingReportPayload
): Promise<TrainingSessionReportDto> {
  const headers = await getCoachAuthHeaders();
  return apiFetch<TrainingSessionReportDto>(
    `${TRAINING_BY_ID_PATH}/${encodeURIComponent(trainingId)}/report`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    }
  );
}
