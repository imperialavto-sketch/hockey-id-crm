/**
 * PHASE 6C — Deprecation signals for `GET /api/legacy/coaches/[id]/trainings` (read path only).
 * Does not disable the route. CRM UI uses canonical `GET /api/coaches/[id]/trainings`.
 * See `docs/TRAINING_JOURNAL_LEGACY_READ_READINESS_PHASE_6C.md`.
 */
export function legacyCoachTrainingsReadSuccessHeaders(coachId: string): HeadersInit {
  const canonicalPath = `/api/coaches/${encodeURIComponent(coachId)}/trainings`;
  return {
    Deprecation: "true",
    Link: `<${canonicalPath}>; rel="alternate"`,
  };
}
