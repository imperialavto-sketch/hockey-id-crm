import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; aid: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "edit");
  if (res) return res;
  try {
    const { id, aid } = await params;
    if (!id || !aid) {
      return NextResponse.json(
        { error: "ID игрока и достижения обязательны" },
        { status: 400 }
      );
    }

    const achievement = await prisma.achievement.findFirst({
      where: { id: aid, playerId: id },
    });
    if (!achievement) {
      return NextResponse.json(
        { error: "Достижение не найдено" },
        { status: 404 }
      );
    }
    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (player) {
      const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
      if (accessRes) return accessRes;
    }

    await prisma.achievement.delete({ where: { id: aid } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/player/[id]/achievement/[aid] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка удаления достижения",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
