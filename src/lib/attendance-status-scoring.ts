/**
 * Shared attendance semantics for CRM scoring and AI prompts.
 * Canonical `TrainingAttendance.status` is `present` | `absent` (typically lowercase in DB).
 * Legacy `Attendance.status` used Prisma enum strings `PRESENT` | `ABSENT` | `LATE` | `EXCUSED`.
 */

/**
 * True if this row counts as "was present" for percent / score.
 * Matches legacy `status === "PRESENT"` behavior: canonical `present` (any case) maps to present; **LATE is not** counted as present.
 */
export function isAttendancePresentForScoring(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toUpperCase() === "PRESENT";
}
