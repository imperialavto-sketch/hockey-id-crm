import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "edit");
  if (res) return res;
  try {
    const { id, vid } = await params;
    if (!id || !vid) {
      return NextResponse.json(
        { error: "ID игрока и видео обязательны" },
        { status: 400 }
      );
    }

    const video = await prisma.video.findFirst({
      where: { id: vid, playerId: id },
    });
    if (!video) {
      return NextResponse.json(
        { error: "Видео не найдено" },
        { status: 404 }
      );
    }
    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (player) {
      const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
      if (accessRes) return accessRes;
    }

    await prisma.video.delete({ where: { id: vid } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/player/[id]/video/[vid] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка удаления видео",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
