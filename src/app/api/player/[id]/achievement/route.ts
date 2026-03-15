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
    const { title, year, description } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Название достижения обязательно" },
        { status: 400 }
      );
    }

    const y = year != null ? Number(year) : new Date().getFullYear();
    if (isNaN(y) || y < 1990 || y > 2030) {
      return NextResponse.json(
        { error: "Некорректный год" },
        { status: 400 }
      );
    }

    const achievement = await prisma.achievement.create({
      data: {
        playerId: id,
        title: String(title).trim(),
        year: y,
        description: description ? String(description).trim() : null,
      },
    });

    return NextResponse.json(achievement);
  } catch (error) {
    console.error("POST /api/player/[id]/achievement failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка добавления достижения",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
