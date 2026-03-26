/**
 * Parent Mobile API — player stats.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { getParentPlayerStats } from "@/lib/parent-players";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }

  const user = await getAuthFromRequest(req);

  if (user?.role !== "PARENT" || !user?.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  try {
    const stats = await getParentPlayerStats(user.parentId, id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/parent/mobile/player/[id]/stats failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки статистики" },
      { status: 500 }
    );
  }
}
