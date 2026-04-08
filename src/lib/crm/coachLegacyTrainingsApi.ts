/**
 * CRM coach trainings URL helpers.
 *
 * PHASE 5C: **Tab** uses `coachCanonicalTrainingSessionsListUrl` + session-journal APIs (`coachTrainingsTabCanonical.ts`).
 * PHASE 5D: **no** `src/` importers.
 * PHASE 5E–6C: zero `src/` importers; GET adds deprecation headers — `docs/TRAINING_JOURNAL_LEGACY_READ_READINESS_PHASE_6C.md`. Sunset inventory: `docs/TRAINING_JOURNAL_FINAL_CLEANUP_PLAN_PHASE_5F.md`.
 */

export function coachLegacyTrainingsListUrl(coachId: string): string {
  return `/api/legacy/coaches/${encodeURIComponent(coachId)}/trainings`;
}

/** Canonical session list; `journal` from SESSION JOURNAL SSOT (`TrainingSessionCoachJournal`), not legacy `TrainingJournal`. */
export function coachCanonicalTrainingSessionsListUrl(coachId: string): string {
  return `/api/coaches/${encodeURIComponent(coachId)}/trainings`;
}
