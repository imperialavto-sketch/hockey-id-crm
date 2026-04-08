/**
 * COACH TAB NOW USES SESSION JOURNAL SSOT — view-model for CRM «Тренировки» tab.
 * Source: `GET /api/coaches/[id]/trainings` (`coachCanonicalTrainingSessionsListUrl`).
 * LEGACY coach-detail list not used by CRM tab — Phase **6C** `docs/TRAINING_JOURNAL_LEGACY_READ_READINESS_PHASE_6C.md`.
 */

export type CoachTrainingsTabJournalEntry = {
  id: string;
  topic: string | null;
  goals: string | null;
  notes: string | null;
  teamComment: string | null;
};

/** Row shape consumed by the trainings table + journal modal (matches canonical GET JSON). */
export type CoachTrainingsTabRow = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  team: { id: string; name: string } | null;
  journal?: CoachTrainingsTabJournalEntry[];
  _count?: { attendances: number };
};

/** Parses canonical list response; returns [] on error or non-array. */
export function parseCoachCanonicalTrainingsTabResponse(json: unknown): CoachTrainingsTabRow[] {
  if (!Array.isArray(json)) return [];
  return json as CoachTrainingsTabRow[];
}
