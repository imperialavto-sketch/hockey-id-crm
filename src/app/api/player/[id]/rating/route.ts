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
    const { id: playerId } = await params;
    const player = await prisma.player.findUnique({ where: { id: playerId }, include: { team: true } });
    if (!player) return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const body = await req.json().catch(() => ({}));
    const { coachId, rating, recommendation } = body;

    if (!coachId || rating == null) {
      return NextResponse.json(
        { error: "Тренер и оценка обязательны" },
        { status: 400 }
      );
    }

    const r = Math.min(5, Math.max(1, Number(rating)));
    const coachIdStr = String(coachId);
    const rec = recommendation !== undefined ? (recommendation ? String(recommendation).trim() || null : null) : undefined;
    const existing = await prisma.coachRating.findFirst({
      where: { coachId: coachIdStr, playerId },
      include: { coach: true },
    });
    const data = existing
      ? await prisma.coachRating.update({
          where: { id: existing.id },
          data: {
            rating: r,
            ...(rec !== undefined && { recommendation: rec }),
          },
          include: { coach: true },
        })
      : await prisma.coachRating.create({
          data: {
            coachId: coachIdStr,
            playerId,
            rating: r,
            recommendation: recommendation ? String(recommendation).trim() || null : null,
          },
          include: { coach: true },
        });
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/player/[id]/rating failed:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения оценки" },
      { status: 500 }
    );
  }
}
