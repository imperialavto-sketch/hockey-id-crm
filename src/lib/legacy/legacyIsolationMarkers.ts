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

export type LegacyTrainingHttpWriteOutcomeStage =
  | "before_write"
  | "committed"
  | "policy_disabled";

export type LegacyTrainingHttpWriteLogFields = {
  event: "legacy_training_write_attempt" | "legacy_training_write_committed";
  surface: string;
  method: string;
  trainingId: string;
  userId: string;
  outcomeStage: LegacyTrainingHttpWriteOutcomeStage;
  userAgent?: string;
  requestId?: string;
  bulkUpdatedCount?: number;
};

function normalizedLegacyTrainingWritePath(surface: string): string {
  if (surface.includes("attendance/bulk")) {
    return "/api/legacy/trainings/[id]/attendance/bulk";
  }
  if (surface.includes("/attendance")) {
    return "/api/legacy/trainings/[id]/attendance";
  }
  return "/api/legacy/trainings/[id]";
}

function pickRequestId(req: NextRequest): string | undefined {
  return (
    req.headers.get("x-request-id") ??
    req.headers.get("x-vercel-id") ??
    req.headers.get("cf-ray") ??
    undefined
  );
}

function truncateUa(ua: string | null): string | undefined {
  if (!ua) return undefined;
  const t = ua.trim();
  if (!t) return undefined;
  return t.length > 200 ? `${t.slice(0, 200)}…` : t;
}

/** Single-line JSON after grep-friendly prefix; no body fields, no emails. */
export function logLegacyTrainingHttpWrite(
  req: NextRequest,
  fields: LegacyTrainingHttpWriteLogFields
): void {
  const payload = {
    ...fields,
    normalizedPath: normalizedLegacyTrainingWritePath(fields.surface),
    marker: "[LEGACY WRITE]",
    ts: new Date().toISOString(),
    userAgent: fields.userAgent ?? truncateUa(req.headers.get("user-agent")),
    requestId: fields.requestId ?? pickRequestId(req),
  };
  console.info(`[LEGACY WRITE] ${JSON.stringify(payload)}`);
}

export function warnLegacyMixedAnalytics(ctx: { req: NextRequest; userId: string }): void {
  warnLegacyTrainingContourRead({
    surface:
      "[MIXED LEGACY READ] GET /api/analytics — legacy Player.attendances & Team.trainings; canonical tabs: /api/analytics/attendance (TrainingAttendance).",
    req: ctx.req,
    userId: ctx.userId,
  });
}
