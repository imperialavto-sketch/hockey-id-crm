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
    const { speed, shotAccuracy, dribbling, stamina } = body;

    const data: { speed?: number; shotAccuracy?: number; dribbling?: number; stamina?: number } = {};
    if (speed != null) data.speed = Math.min(100, Math.max(0, Number(speed) || 0));
    if (shotAccuracy != null) data.shotAccuracy = Math.min(100, Math.max(0, Number(shotAccuracy) || 0));
    if (dribbling != null) data.dribbling = Math.min(100, Math.max(0, Number(dribbling) || 0));
    if (stamina != null) data.stamina = Math.min(100, Math.max(0, Number(stamina) || 0));

    const skills = await prisma.skills.upsert({
      where: { playerId: id },
      create: {
        playerId: id,
        speed: data.speed ?? null,
        shotAccuracy: data.shotAccuracy ?? null,
        dribbling: data.dribbling ?? null,
        stamina: data.stamina ?? null,
      },
      update: data,
    });

    return NextResponse.json(skills);
  } catch (error) {
    console.error("POST /api/player/[id]/skills failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка обновления навыков",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
