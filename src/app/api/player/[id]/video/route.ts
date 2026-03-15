import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "edit");
  if (res) return res;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
    }

    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const body = await req.json().catch(() => ({}));
    const { title, url } = body;

    if (!title || !url) {
      return NextResponse.json(
        { error: "Название и ссылка на видео обязательны" },
        { status: 400 }
      );
    }

    const video = await prisma.video.create({
      data: {
        playerId: id,
        title: String(title).trim(),
        url: String(url).trim(),
      },
    });

    return NextResponse.json(video);
  } catch (error) {
    console.error("POST /api/player/[id]/video failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка добавления видео",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
