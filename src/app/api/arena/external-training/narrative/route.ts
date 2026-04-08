/**
 * PHASE 2 API LOCK — NON_CORE_EXTERNAL_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `apiContours.ts`).
 * PHASE 1: `NON_CORE_EXTERNAL_CONTOUR`. See docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { getParentPlayerById } from "@/lib/parent-players";
import { buildExternalDevelopmentNarrative } from "@/lib/arena/build-external-development-narrative";

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

  const narrative = await buildExternalDevelopmentNarrative({
    playerId,
    parentId: user.parentId,
  });
  return NextResponse.json(narrative);
}
