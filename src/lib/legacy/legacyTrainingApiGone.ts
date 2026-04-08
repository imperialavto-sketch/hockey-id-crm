import { NextResponse } from "next/server";

const LEGACY_TRAINING_API_GONE_HEADERS = {
  "X-Deprecated": "legacy-training-api",
} as const;

/** STAGE 1: stable 410 for removed legacy Training / Attendance read APIs. */
export function legacyTrainingApiGoneResponse(routeName: string) {
  console.warn("[GONE][legacy-training]", routeName);
  return NextResponse.json(
    { error: "legacy_training_api_removed", code: "GONE" },
    { status: 410, headers: LEGACY_TRAINING_API_GONE_HEADERS }
  );
}
