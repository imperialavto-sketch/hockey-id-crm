import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentRole } from "@/lib/api-rbac";
import { forbiddenResponse } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { user, res } = await requireParentRole(req);
  if (res) return res;
  const parentId = user!.parentId;
  if (!parentId) {
    return forbiddenResponse("Родитель не привязан к аккаунту. Обратитесь к администратору.");
  }
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId");

    const where = {
      AND: [
        {
          OR: [
            { parentId },
            { parentPlayers: { some: { parentId } } },
          ],
        },
        ...(playerId ? [{ id: playerId }] : []),
      ],
    };

    const players = await prisma.player.findMany({
      where,
      include: {
        team: true,
        profile: true,
        stats: { orderBy: { season: "desc" } },
        notes: true,
        passport: true,
        skills: true,
        achievements: { orderBy: { year: "desc" } },
        videos: true,
        payments: { orderBy: [{ year: "desc" }, { month: "desc" }] },
        teamHistory: { orderBy: { createdAt: "desc" } },
        attendances: {
          include: { training: true },
          orderBy: { training: { startTime: "desc" } },
        },
      },
      orderBy: { lastName: "asc" },
    });

    const withTrainings = await Promise.all(
      players.map(async (p) => {
        if (!p.teamId) return { ...p, upcomingTrainings: [] };
        const trainings = await prisma.training.findMany({
          where: { teamId: p.teamId },
          orderBy: { startTime: "asc" },
        });
        return { ...p, upcomingTrainings: trainings };
      })
    );

    return NextResponse.json(withTrainings);
  } catch (error) {
    console.error("GET /api/parent/players failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки игроков",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
