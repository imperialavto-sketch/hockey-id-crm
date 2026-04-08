import { NextResponse } from "next/server";

/**
 * PHASE 6B — Kill-switch for **HTTP only** (`POST`/`PUT` `/api/training-journal*`).
 * Does **not** affect `prisma.trainingJournal` in seeds or other server code.
 * See `docs/TRAINING_JOURNAL_HTTP_WRITE_KILLSWITCH_PHASE_6B.md`. Staging rollout: `docs/TRAINING_JOURNAL_STAGING_EXECUTION_PHASE_7A.md`.
 */
export function isLegacyTrainingJournalHttpWritesDisabled(): boolean {
  const v = process.env.DISABLE_LEGACY_TRAINING_JOURNAL_WRITES;
  if (v == null || String(v).trim() === "") return false;
  const n = String(v).trim().toLowerCase();
  return n === "1" || n === "true" || n === "yes";
}

/** Stable machine code for clients; human text in `error` (RU). */
export const LEGACY_TRAINING_JOURNAL_WRITES_DISABLED_CODE =
  "LEGACY_TRAINING_JOURNAL_WRITES_DISABLED" as const;

export function legacyTrainingJournalWritesDisabledResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Запись в устаревший журнал (legacy TrainingJournal) отключена на сервере. Используйте POST/PUT /api/training-session-journal.",
      code: LEGACY_TRAINING_JOURNAL_WRITES_DISABLED_CODE,
    },
    {
      status: 403,
      headers: {
        Deprecation: "true",
      },
    }
  );
}
