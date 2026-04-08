/**
 * PHASE 2 API LOCK — LEGACY_API_FAMILY — STAGE 1: GET returns 410 (legacy read removed).
 * Canonical list: `GET /api/coaches/[id]/trainings` (TrainingSession + session journal).
 */

import { NextRequest } from "next/server";
import { legacyTrainingApiGoneResponse } from "@/lib/legacy/legacyTrainingApiGone";

export async function GET(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  return legacyTrainingApiGoneResponse("GET /api/legacy/coaches/[id]/trainings");
}
