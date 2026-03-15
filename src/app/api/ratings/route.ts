import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";
import { calculatePlayerRanking } from "@/lib/player-ranking";

export async function GET(req: NextRequest) {
  const { user, res } = await requirePermission(req, "players", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const position = searchParams.get("position");
    const birthYearParam = searchParams.get("birthYear");

    const where: Record<string, unknown> = {};
    const accessibleIds = await getAccessiblePlayerIds(user!, prisma);
    if (accessibleIds !== null) {
      where.id = { in: accessibleIds };
    }
    if (teamId) where.teamId = teamId;
    if (position) where.position = position;
    if (birthYearParam) {
      const birthYear = parseInt(birthYearParam, 10);
      if (!isNaN(birthYear)) where.birthYear = birthYear;
    }

    const players = await prisma.player.findMany({
      where,
      include: {
        team: { select: { id: true, name: true } },
        skills: true,
        coachRatings: { select: { rating: true } },
        attendances: { select: { status: true } },
        stats: true,
        achievements: { select: { id: true } },
      },
    });

    const items = players.map((p) => {
      const ranking = calculatePlayerRanking({
        skills: p.skills ?? undefined,
        coachRatings: p.coachRatings,
        attendances: p.attendances,
        stats: p.stats,
        achievements: p.achievements,
      });
      return {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        team: p.team ? { id: p.team.id, name: p.team.name } : null,
        position: p.position,
        birthYear: p.birthYear,
        rankingScore: ranking.rankingScore,
        developmentIndex: ranking.developmentIndex,
        attendanceScore: ranking.attendanceScore,
        coachRatingScore: ranking.coachRatingScore,
      };
    });

    items.sort((a, b) => b.rankingScore - a.rankingScore);
    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/ratings failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки рейтинга",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
