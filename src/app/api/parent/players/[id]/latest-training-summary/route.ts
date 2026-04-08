import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";
import { getParentLatestLiveTrainingSummaryForPlayer } from "@/lib/live-training/parent-latest-live-training-summary";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playerId } = await params;
  if (!playerId?.trim()) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }

  const user = await getAuthFromRequest(_req);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const allowed = await canParentAccessPlayer(user.parentId, playerId);
  if (!allowed) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const payload = await getParentLatestLiveTrainingSummaryForPlayer(playerId);
    return NextResponse.json(payload);
  } catch (e) {
    console.error("GET /api/parent/players/[id]/latest-training-summary:", e);
    return NextResponse.json({ error: "Не удалось загрузить данные" }, { status: 500 });
  }
}
