import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { getParentPlayerById } from "@/lib/parent-players";
import { buildArenaSummarySurface } from "@/lib/arena/build-arena-summary-surface";

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

  const surface = await buildArenaSummarySurface({
    playerId,
    parentId: user.parentId,
  });
  return NextResponse.json(surface);
}
