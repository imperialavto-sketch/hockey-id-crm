/**
 * Resume Session Flow — detect and summarize incomplete session draft.
 * Local first, then API active session as fallback.
 */

import type { PersistedCoachInputState } from "./coachInputStorage";
import { loadCoachInputState } from "./coachInputStorage";
import type { SessionStatus } from "@/models/sessionObservation";
import type { TrainingSessionDraft } from "@/models/sessionObservation";
import { getActiveLiveTrainingSession } from "@/services/liveTrainingService";

export const COACH_INPUT_ROUTE = "/coach-input";

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

export type ResumeSessionSource =
  | "coachInputDraft"
  | "activeLiveTrainingSessionApi"
  /** Legacy literal from older builds; treat like live training remote resume. */
  | "activeCoachSessionApi";

/** True when resume row comes from `/api/live-training/sessions/active` (or legacy coach-session literal). */
export function isActiveLiveTrainingResumeSource(source: ResumeSessionSource | undefined): boolean {
  return source === "activeLiveTrainingSessionApi" || source === "activeCoachSessionApi";
}

export interface ResumeSessionSummary {
  /** Local coach-input draft vs active `LiveTrainingSession` from `/api/live-training/sessions/active`. */
  source: ResumeSessionSource;
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
      source: "coachInputDraft",
      status: draft.status,
      observationCount: obs.length,
      playerCount: playerIds.size,
      startedAt: draft.startedAt,
      updatedAt: latestObs,
      summaryLine: statusLabel,
    };
  }

  let active: Awaited<ReturnType<typeof getActiveLiveTrainingSession>>;
  try {
    active = await getActiveLiveTrainingSession();
  } catch {
    return null;
  }
  if (!active) return null;
  if (active.status !== "live" && active.status !== "review") return null;

  const startedAt = new Date(active.startedAt).getTime();
  const observationCount =
    active.analyticsSummary?.signalCount ??
    active.outcome?.signalsCreatedCount ??
    active.outcome?.playerObservationCount ??
    0;
  const playerCount = Math.max(
    1,
    active.analyticsSummary?.playersWithSignals ??
      active.outcome?.affectedPlayersCount ??
      (observationCount > 0 ? 1 : 0)
  );
  const status: SessionStatus = active.status === "review" ? "review" : "active";
  const summaryLine =
    active.status === "review" ? "Нужен разбор сессии" : "Тренировка активна";

  return {
    source: "activeLiveTrainingSessionApi",
    status,
    observationCount,
    playerCount,
    startedAt,
    updatedAt: startedAt,
    summaryLine,
  };
}
