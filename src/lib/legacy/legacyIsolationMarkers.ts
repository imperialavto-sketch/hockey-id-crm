/**
 * [LEGACY — DO NOT EXPAND]
 * Runtime markers for `Training` / `Attendance` / `TrainingJournal` (school contour).
 * Canonical SSOT: `TrainingSession` + `TrainingAttendance` + `TrainingSessionCoachJournal`.
 */

import type { NextRequest } from "next/server";

const LEGACY_READ_TAIL =
  "Canonical SSOT: TrainingSession / TrainingAttendance; do not expand legacy reads.";

/** TEMP: verbose verification log — remove or gate when legacy sunset is done. */
export type LegacyReadLogContext = {
  surface: string;
  req: NextRequest;
  /** CRM `User.id` from session when authenticated */
  userId?: string | null;
  /** Route-scoped coach id (e.g. `/api/legacy/coaches/[id]/trainings`) */
  coachId?: string | null;
  /** Route-scoped player id when helpful for attribution */
  playerId?: string | null;
};

/** Unified server-side marker for HTTP handlers that read legacy Training / Attendance (or embed them in a mixed JSON body). */
export function warnLegacyTrainingContourRead(ctx: LegacyReadLogContext): void {
  const timestamp = new Date().toISOString();
  const route = ctx.req.nextUrl.pathname;
  const method = ctx.req.method;
  const parts: string[] = [
    "[LEGACY READ]",
    `surface=${ctx.surface}`,
    `route=${route}`,
    `method=${method}`,
    `timestamp=${timestamp}`,
  ];
  if (ctx.userId) parts.push(`userId=${ctx.userId}`);
  if (ctx.coachId) parts.push(`coachId=${ctx.coachId}`);
  if (ctx.playerId) parts.push(`playerId=${ctx.playerId}`);
  parts.push(LEGACY_READ_TAIL);
  console.warn(parts.join(" "));
}

export function warnLegacyTrainingContourWrite(surface: string): void {
  console.warn(
    "[LEGACY WRITE]",
    surface,
    "— use TrainingSession / TrainingAttendance APIs for product; do not expand legacy writes."
  );
}

export function warnLegacyMixedAnalytics(ctx: { req: NextRequest; userId: string }): void {
  warnLegacyTrainingContourRead({
    surface:
      "[MIXED LEGACY READ] GET /api/analytics — legacy Player.attendances & Team.trainings; canonical tabs: /api/analytics/attendance (TrainingAttendance).",
    req: ctx.req,
    userId: ctx.userId,
  });
}
