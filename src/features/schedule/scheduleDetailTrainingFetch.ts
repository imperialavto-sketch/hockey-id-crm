/**
 * PHASE 1 — CRM SCHEDULE TRUTH: detail read is only `GET /api/trainings/[id]` (`TrainingSession`).
 * ❗ LEGACY — DO NOT USE: `GET /api/legacy/trainings/[id]` and compat fallback were removed from CRM active flow.
 */

const CRM_FETCH_INIT: RequestInit = { credentials: "include" };

export async function fetchScheduleTrainingDetailResource(
  id: string
): Promise<{ data: unknown }> {
  const r = await fetch(`/api/trainings/${encodeURIComponent(id)}`, CRM_FETCH_INIT);
  if (!r.ok) throw new Error("fetch failed");
  const data = await r.json().catch(() => ({}));
  return { data };
}

/** Roster + statuses: `GET /api/trainings/[id]/attendance` (`TrainingAttendance` / `TrainingSession`). */
export async function fetchSessionAttendanceRosterPayload(
  trainingSessionId: string
): Promise<unknown> {
  const attendanceRes = await fetch(
    `/api/trainings/${encodeURIComponent(trainingSessionId)}/attendance`,
    CRM_FETCH_INIT
  );
  return attendanceRes.json().catch(() => ({}));
}
