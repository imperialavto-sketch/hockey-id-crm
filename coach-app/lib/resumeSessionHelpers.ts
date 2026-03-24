/**
 * Resume Session Flow — detect and summarize incomplete session draft.
 * Local first, then API active session as fallback.
 */

import type { PersistedCoachInputState } from "./coachInputStorage";
import { loadCoachInputState } from "./coachInputStorage";
import type { SessionStatus } from "@/models/sessionObservation";
import type { TrainingSessionDraft } from "@/models/sessionObservation";
import { getActiveCoachSession, DEFAULT_TEAM_ID } from "@/services/coachSessionLiveService";

export const COACH_INPUT_ROUTE = "/dev/coach-input";

/**
 * Session Exit Guard — needs guard when draft is active/review or has observations.
 * Completed / idle empty = no guard.
 */
export function needsSessionExitGuard(draft: TrainingSessionDraft | null): boolean {
  if (!draft) return false;
  const hasObservations = (draft.observations?.length ?? 0) > 0;
  const isActiveOrReview = draft.status === "active" || draft.status === "review";
  return isActiveOrReview || hasObservations;
}

export interface ResumeSessionSummary {
  status: SessionStatus;
  observationCount: number;
  playerCount: number;
  startedAt: number;
  updatedAt: number;
  summaryLine: string;
}

/**
 * Resume candidate = has sessionDraft AND (status active/review OR has observations).
 */
export function isResumeCandidate(state: PersistedCoachInputState | null): boolean {
  if (!state?.sessionDraft) return false;
  const draft = state.sessionDraft;
  const hasObservations = (draft.observations?.length ?? 0) > 0;
  const isActiveOrReview = draft.status === "active" || draft.status === "review";
  if (isActiveOrReview) return true;
  if (hasObservations) return true;
  return false;
}

/**
 * Build summary for resume block. Returns null if not a resume candidate.
 * Local first; if no local resume, checks API for active session.
 */
export async function getResumeSessionSummary(): Promise<ResumeSessionSummary | null> {
  const state = await loadCoachInputState();
  if (isResumeCandidate(state)) {
    const draft = state!.sessionDraft;
    const obs = draft.observations ?? [];
    const playerIds = new Set(obs.map((o) => o.playerId));
    const latestObs = obs.reduce(
      (max, o) => (o.createdAt > max ? o.createdAt : max),
      draft.startedAt
    );
    const statusLabel =
      draft.status === "active"
        ? "Тренировка активна"
        : "Есть незавершенная сессия";
    return {
      status: draft.status,
      observationCount: obs.length,
      playerCount: playerIds.size,
      startedAt: draft.startedAt,
      updatedAt: latestObs,
      summaryLine: statusLabel,
    };
  }

  const active = await getActiveCoachSession(DEFAULT_TEAM_ID);
  if (!active) return null;

  const startedAt = active.startedAt ? new Date(active.startedAt).getTime() : Date.now();
  return {
    status: "active",
    observationCount: active.observationsCount ?? 0,
    playerCount: Math.max(1, active.observationsCount ?? 1),
    startedAt,
    updatedAt: startedAt,
    summaryLine: "Тренировка активна",
  };
}
