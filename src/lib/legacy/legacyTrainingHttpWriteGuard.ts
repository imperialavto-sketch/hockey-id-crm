import { NextResponse } from "next/server";

/**
 * Opt-in kill-switch for HTTP writes to legacy `Training` / `Attendance` via
 * `/api/legacy/trainings/[id]` (PATCH/DELETE) and attendance POST routes.
 * Default: writes allowed (unset or truthy). Set to false/0/no to reject before Prisma writes.
 */
export function isLegacyTrainingHttpWritesEnabled(): boolean {
  const v = process.env.LEGACY_TRAINING_HTTP_WRITES_ENABLED;
  if (v == null || String(v).trim() === "") return true;
  const n = String(v).trim().toLowerCase();
  if (n === "0" || n === "false" || n === "no") return false;
  return true;
}

export const LEGACY_TRAINING_HTTP_WRITES_DISABLED_CODE =
  "LEGACY_TRAINING_HTTP_WRITES_DISABLED" as const;

/** Policy response: 403 distinguishes from 410 read-retirement (`legacyTrainingApiGoneResponse`). Clients use `code`. */
export function legacyTrainingHttpWritesDisabledResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "legacy_training_http_writes_disabled",
      code: LEGACY_TRAINING_HTTP_WRITES_DISABLED_CODE,
      message:
        "Запись через legacy HTTP API (Training/Attendance) отключена. Используйте TrainingSession и /api/trainings/*.",
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        Deprecation: "true",
        "X-Deprecated": "legacy-training-http-writes",
      },
    }
  );
}
