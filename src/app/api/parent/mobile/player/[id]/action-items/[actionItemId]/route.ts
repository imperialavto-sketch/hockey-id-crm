/**
 * GET /api/parent/mobile/player/[id]/action-items/[actionItemId]
 * Full coach ActionItem for parent (CRM), scoped to player.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";

export async function GET(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; actionItemId: string }> }
) {
  const { id: playerId, actionItemId } = await params;
  const pid = typeof playerId === "string" ? playerId.trim() : "";
  const aid = typeof actionItemId === "string" ? actionItemId.trim() : "";

  if (!pid) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }
  if (!aid) {
    return NextResponse.json({ error: "ID задачи обязателен" }, { status: 400 });
  }

  const player = await prisma.player.findUnique({
    where: { id: pid },
    select: { id: true },
  });
  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  const user = await getAuthFromRequest(_req);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const canAccess = await canParentAccessPlayer(user.parentId, pid);
  if (!canAccess) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const item = await prisma.actionItem.findFirst({
      where: {
        id: aid,
        playerId: pid,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
    }

    return NextResponse.json({
      id: item.id,
      playerId: item.playerId,
      title: item.title,
      description: item.description,
      status: item.status,
      dueDate: null,
      createdAt: item.createdAt.toISOString(),
      voiceNoteId: item.voiceNoteId ?? null,
    });
  } catch (error) {
    console.error(
      "GET /api/parent/mobile/player/[id]/action-items/[actionItemId] failed:",
      error
    );
    return NextResponse.json(
      {
        error: "Ошибка загрузки задачи",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
