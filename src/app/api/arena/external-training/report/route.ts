/**
 * PHASE 2 API LOCK — NON_CORE_EXTERNAL_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `apiContours.ts`).
 * PHASE 1: `NON_CORE_EXTERNAL_CONTOUR` — `ExternalTrainingReport`. See docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { getParentPlayerById } from "@/lib/parent-players";
import { getLatestExternalTrainingReportForPlayer } from "@/lib/arena/external-training-reports";
import { buildExternalTrainingReportView } from "@/lib/arena/build-external-training-report-view";

export async function GET(request: NextRequest) {
  const user = await getAuthFromRequest(request);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return unauthorizedResponse("Необходима авторизация родителя");
  }

  const playerId = request.nextUrl.searchParams.get("playerId")?.trim();
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const player = await getParentPlayerById(user.parentId, playerId);
  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  const latest = await getLatestExternalTrainingReportForPlayer(playerId);
  return NextResponse.json(
    latest ? buildExternalTrainingReportView(latest) : null
  );
}
