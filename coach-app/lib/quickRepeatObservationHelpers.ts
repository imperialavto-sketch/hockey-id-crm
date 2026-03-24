/**
 * Quick Repeat Observation — helpers for fast observation input.
 * Uses sessionDraft only. No backend.
 */

import type { TrainingSessionDraft, SessionObservation } from "@/models/sessionObservation";

/**
 * Get the last (most recent) observation from current session draft.
 * Observations are stored newest-first, so index 0 is last added.
 */
export function getLastDraftObservation(
  sessionDraft: TrainingSessionDraft | null
): SessionObservation | null {
  if (!sessionDraft?.observations?.length) return null;
  return sessionDraft.observations[0] ?? null;
}
