import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "analytics", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    const coaches = await prisma.coach.findMany({
      where: { isMarketplaceIndependent: false },
      include: {
        teams: {
          where: teamId ? { id: teamId } : undefined,
          include: { trainings: true, players: true },
        },
        coachRatings: { include: { player: true } },
      },
    });

    const data = coaches.map((c) => {
      const trainingsCount = c.teams.reduce((s, t) => s + t.trainings.length, 0);
      const allRatings = c.coachRatings.map((r) => r.rating);
      const avgRating = allRatings.length
        ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
        : 0;
      const recommendationsCount = c.coachRatings.filter((r) => r.recommendation).length;

      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        trainingsCount,
        avgRating,
        recommendationsCount,
        playersCount: c.teams.reduce((s, t) => s + t.players.length, 0),
      };
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/analytics/coaches failed:", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
