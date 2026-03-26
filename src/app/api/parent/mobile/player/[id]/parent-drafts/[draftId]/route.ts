/**
 * GET /api/parent/mobile/player/[id]/parent-drafts/[draftId]
 * Full standalone ParentDraft for parent (CRM), scoped to player.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";

export async function GET(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; draftId: string }> }
) {
  const { id: playerId, draftId } = await params;
  const pid = typeof playerId === "string" ? playerId.trim() : "";
  const did = typeof draftId === "string" ? draftId.trim() : "";

  if (!pid) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }
  if (!did) {
    return NextResponse.json({ error: "ID черновика обязателен" }, { status: 400 });
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
    const draft = await prisma.parentDraft.findFirst({
      where: {
        id: did,
        playerId: pid,
      },
    });

    if (!draft) {
      return NextResponse.json({ error: "Черновик не найден" }, { status: 404 });
    }

    /** Model has no title/status/updatedAt — contract fields for client; no schema change. */
    return NextResponse.json({
      id: draft.id,
      playerId: draft.playerId,
      title: null,
      content: draft.text,
      status: null,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: null,
      voiceNoteId: draft.voiceNoteId ?? null,
    });
  } catch (error) {
    console.error(
      "GET /api/parent/mobile/player/[id]/parent-drafts/[draftId] failed:",
      error
    );
    return NextResponse.json(
      {
        error: "Ошибка загрузки черновика",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
