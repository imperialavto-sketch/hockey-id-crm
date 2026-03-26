import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await ctx.params;
  const actionId = typeof id === "string" ? id.trim() : "";
  if (!actionId) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  try {
    const item = await prisma.actionItem.findFirst({
      where: { id: actionId, coachId: user!.id },
    });
    if (!item) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    const player = item.playerId
      ? await prisma.player.findUnique({
          where: { id: item.playerId },
          select: { firstName: true, lastName: true },
        })
      : null;

    return NextResponse.json({
      id: item.id,
      coachId: item.coachId,
      playerId: item.playerId,
      playerName: player
        ? [player.firstName, player.lastName].filter(Boolean).join(" ").trim() || "Игрок"
        : null,
      title: item.title,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      voiceNoteId: item.voiceNoteId ?? null,
    });
  } catch (error) {
    console.error("GET /api/actions/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки задачи",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

