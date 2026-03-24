/**
 * Coach Session Live API — start, resume, observations, review.
 * Auth: getCoachAuthHeaders (Bearer; dev without token gets 401).
 * Graceful fallback when backend unavailable.
 */

import { apiFetch, ApiRequestError, isApi404 } from "@/lib/api";
import { getCoachAuthHeaders } from "@/lib/coachAuth";
import { isEndpointUnavailable, markEndpointUnavailable } from "@/lib/endpointAvailability";

const DEFAULT_TEAM_ID = "u12";

export interface StartSessionResponse {
  sessionId: string;
  teamId: string;
  startedAt?: string;
}

export interface ActiveSessionResponse {
  sessionId: string;
  teamId: string;
  startedAt: string;
  observationsCount?: number;
}

export interface CreateObservationPayload {
  sessionId: string;
  teamId?: string;
  playerId: string;
  playerName?: string;
  skillKey?: string;
  noteType?: string;
  score?: number;
  noteText?: string;
}

export interface ObservationResponse {
  id: string;
  sessionId: string;
  playerId: string;
  playerName?: string;
  skillKey?: string;
  impact?: string;
  score?: number;
  noteText?: string;
  createdAt?: string;
}

export interface SessionReviewResponse {
  sessionId: string;
  observationsCount?: number;
  playersCount?: number;
  playersInFocus?: string[];
  topPlayerIds?: string[];
  topSkillKeys?: string[];
  recentObservations?: Array<{
    id: string;
    playerId: string;
    playerName?: string;
    skillKey?: string;
    impact?: string;
    noteText?: string;
    createdAt?: string;
  }>;
  isReadyForReport?: boolean;
}

const SESSIONS_START_PATH = "/api/coach/sessions/start";
const SESSIONS_ACTIVE_PATH = "/api/coach/sessions/active";

/**
 * Start a new training session.
 * On 404 (endpoint absent), returns a local session so coach can continue offline.
 */
export async function startCoachSession(
  teamId: string = DEFAULT_TEAM_ID
): Promise<StartSessionResponse> {
  if (isEndpointUnavailable(SESSIONS_START_PATH)) {
    return {
      sessionId: `session_local_${Date.now()}`,
      teamId,
      startedAt: new Date().toISOString(),
    };
  }
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<StartSessionResponse>(SESSIONS_START_PATH, {
      method: "POST",
      headers,
      body: JSON.stringify({ teamId }),
    });
    return res;
  } catch (e) {
    if (isApi404(e)) {
      markEndpointUnavailable(SESSIONS_START_PATH);
      return {
        sessionId: `session_local_${Date.now()}`,
        teamId,
        startedAt: new Date().toISOString(),
      };
    }
    throw e;
  }
}

/**
 * Get active session for team (if any).
 * Returns null on 404 or error.
 */
export async function getActiveCoachSession(
  teamId?: string
): Promise<ActiveSessionResponse | null> {
  const path = SESSIONS_ACTIVE_PATH + (teamId ? `?teamId=${encodeURIComponent(teamId)}` : "");
  if (isEndpointUnavailable(path)) return null;
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<ActiveSessionResponse | null>(path, {
      method: "GET",
      headers,
    });
    return res;
  } catch (e) {
    if (isApi404(e)) markEndpointUnavailable(path);
    return null;
  }
}

const OBSERVATIONS_PATH = "/api/coach/observations";

/**
 * Create an observation.
 * On 404 (endpoint absent), returns a synthetic response so caller does not break.
 */
export async function createCoachObservation(
  payload: CreateObservationPayload
): Promise<ObservationResponse> {
  if (isEndpointUnavailable(OBSERVATIONS_PATH)) {
    return {
      id: `obs_local_${Date.now()}`,
      sessionId: payload.sessionId,
      playerId: payload.playerId,
      createdAt: new Date().toISOString(),
    };
  }
  try {
    const body: Record<string, unknown> = {
      sessionId: payload.sessionId,
      playerId: payload.playerId,
    };
    if (payload.teamId != null) body.teamId = payload.teamId;
    if (payload.playerName != null) body.playerName = payload.playerName;
    if (payload.skillKey != null) body.skillKey = payload.skillKey;
    if (payload.noteType != null) body.noteType = payload.noteType;
    if (payload.score != null) body.score = payload.score;
    if (payload.noteText != null) body.noteText = payload.noteText;

    const headers = await getCoachAuthHeaders();
    return apiFetch<ObservationResponse>(OBSERVATIONS_PATH, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (isApi404(e)) {
      markEndpointUnavailable(OBSERVATIONS_PATH);
      return {
        id: `obs_local_${Date.now()}`,
        sessionId: payload.sessionId,
        playerId: payload.playerId,
        createdAt: new Date().toISOString(),
      };
    }
    throw e;
  }
}

const sessionsObservationsPrefix = "/api/coach/sessions/";

/**
 * Get observations for a session.
 * Returns [] on 404 or error.
 */
export async function getCoachSessionObservations(
  sessionId: string
): Promise<ObservationResponse[]> {
  const path = `${sessionsObservationsPrefix}${encodeURIComponent(sessionId)}/observations`;
  if (isEndpointUnavailable(path)) return [];
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<ObservationResponse[] | { observations?: ObservationResponse[] }>(
      path,
      { method: "GET", headers }
    );
    if (Array.isArray(res)) return res;
    if (res && Array.isArray((res as { observations?: ObservationResponse[] }).observations)) {
      return (res as { observations: ObservationResponse[] }).observations;
    }
    return [];
  } catch (e) {
    if (isApi404(e)) markEndpointUnavailable(path);
    return [];
  }
}

/**
 * Get session review summary.
 * Returns null on 404 or error.
 */
export async function getCoachSessionReview(
  sessionId: string
): Promise<SessionReviewResponse | null> {
  const path = `${sessionsObservationsPrefix}${encodeURIComponent(sessionId)}/review`;
  if (isEndpointUnavailable(path)) return null;
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<SessionReviewResponse>(path, { method: "GET", headers });
    return res ?? null;
  } catch (e) {
    if (isApi404(e)) markEndpointUnavailable(path);
    return null;
  }
}

export { ApiRequestError };
export { DEFAULT_TEAM_ID };
