/**
 * PHASE 2 API LOCK — LEGACY_API_FAMILY — STAGE 1: GET returns 410 (legacy read removed).
 */

import { NextRequest } from "next/server";
import { legacyTrainingApiGoneResponse } from "@/lib/legacy/legacyTrainingApiGone";

export async function GET(_req: NextRequest) {
  return legacyTrainingApiGoneResponse("GET /api/legacy/coach/trainings");
}
