/**
 * GET /api/parent/players/[id]/player-story
 * PHASE 14: мягкая «история развития» для родителя (live training scoped).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";
import { getParentPlayerStory } from "@/lib/live-training/get-parent-player-story";

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
    const data = await getParentPlayerStory(playerId);
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET /api/parent/players/[id]/player-story:", e);
    return NextResponse.json({ error: "Не удалось загрузить данные" }, { status: 500 });
  }
}
