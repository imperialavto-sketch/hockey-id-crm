/**
 * ARCHITECTURE PHASE 4C — Coach CRM «Тренировки» tab vs canonical session list.
 *
 * ## Tab data (Phase 5C) — `GET /api/coaches/[id]/trainings` (`coachCanonicalTrainingSessionsListUrl`)
 * COACH TAB NOW USES SESSION JOURNAL SSOT: rows are `TrainingSession`; `journal` from `TrainingSessionCoachJournal`; writes via `/api/training-session-journal`.
 * LEGACY JOURNAL ROUTES NOT USED on this tab (`coachTrainingsTabCanonical.ts`).
 *
 * ## Legacy list (`GET /api/legacy/coaches/[id]/trainings`)
 * Still live; Phase **6C** adds `Deprecation` + `Link` → canonical on **200** — `docs/TRAINING_JOURNAL_LEGACY_READ_READINESS_PHASE_6C.md`. **Not** used by CRM tab (canonical GET).
 *
 * ## Legacy journal (`TrainingJournal`)
 * `TrainingJournal.trainingId` remains FK → `Training.id` only. NO AUTO-BACKFILL to session journal.
 * PHASE 5F–7B: `docs/TRAINING_JOURNAL_FINAL_CLEANUP_PLAN_PHASE_5F.md` · 6A–6C · `docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md` · 6E/6F seed · staging `docs/TRAINING_JOURNAL_STAGING_EXECUTION_PHASE_7A.md` · review `docs/TRAINING_JOURNAL_STAGING_REVIEW_PHASE_7B.md`.
 *
 * ## Historical note (Phase 4C)
 * «Split tab» (canonical list + legacy journal) was superseded by Phase 5C full cutover to session journal SSOT.
 */

/** Human-readable blocker for docs and code comments. */
export const TRAINING_JOURNAL_LEGACY_TRAINING_ID_FK =
  "TrainingJournal.trainingId → Training.id (Prisma FK); not TrainingSession.id." as const;
