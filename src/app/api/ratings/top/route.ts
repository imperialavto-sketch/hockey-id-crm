import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";
import { calculatePlayerRanking } from "@/lib/player-ranking";

const TOP_LIMIT = 10;

export async function GET(req: NextRequest) {
  const { user, res } = await requirePermission(req, "players", "view");
  if (res) return res;
  try {
    const where: Record<string, unknown> = {};
    const accessibleIds = await getAccessiblePlayerIds(user!, prisma);
    if (accessibleIds !== null) {
      where.id = { in: accessibleIds };
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

    const scored = players.map((p) => {
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
      };
    });

    scored.sort((a, b) => b.rankingScore - a.rankingScore);

    const topPlayersOverall = scored.slice(0, TOP_LIMIT);

    const byTeam: Record<string, typeof scored> = {};
    for (const p of scored) {
      const key = p.team?.id ?? "_no_team";
      if (!byTeam[key]) byTeam[key] = [];
      if (byTeam[key].length < TOP_LIMIT) byTeam[key].push(p);
    }
    const topByTeam = Object.entries(byTeam).map(([teamId, list]) => ({
      teamId: teamId === "_no_team" ? null : teamId,
      teamName:
        teamId === "_no_team"
          ? "Без команды"
          : list[0]?.team?.name ?? "—",
      players: list,
    }));

    const byPosition: Record<string, typeof scored> = {};
    for (const p of scored) {
      const key = p.position ?? "_unknown";
      if (!byPosition[key]) byPosition[key] = [];
      if (byPosition[key].length < TOP_LIMIT) byPosition[key].push(p);
    }
    const topByPosition = Object.entries(byPosition).map(([position, list]) => ({
      position: position === "_unknown" ? "—" : position,
      players: list,
    }));

    return NextResponse.json({
      topPlayersOverall,
      topByTeam,
      topByPosition,
    });
  } catch (error) {
    console.error("GET /api/ratings/top failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки топа рейтинга",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
