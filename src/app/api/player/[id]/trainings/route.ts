import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "view");
  if (res) return res;
  try {
    const { id } = await params;
    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) return NextResponse.json([]);
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;
    if (!player.teamId) return NextResponse.json([]);

    const trainings = await prisma.training.findMany({
      where: { teamId: player.teamId },
      orderBy: { startTime: "desc" },
      include: {
        attendances: {
          where: { playerId: id },
        },
      },
    });

    return NextResponse.json(
      trainings.map((t) => ({
        id: t.id,
        title: t.title,
        startTime: t.startTime,
        endTime: t.endTime,
        location: t.location,
        attendance: t.attendances[0] ?? null,
      }))
    );
  } catch (error) {
    console.error("GET /api/player/[id]/trainings failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки тренировок" },
      { status: 500 }
    );
  }
}
