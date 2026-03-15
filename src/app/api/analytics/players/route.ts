import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "analytics", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    const where = teamId ? { teamId } : {};
    const players = await prisma.player.findMany({
      where,
      include: {
        team: true,
        coachRatings: true,
        stats: { orderBy: { season: "desc" } },
      },
    });

    const byTeam: Record<string, number> = {};
    const byPosition: Record<string, number> = {};
    players.forEach((p) => {
      const team = p.team?.name ?? "Без команды";
      byTeam[team] = (byTeam[team] ?? 0) + 1;
      byPosition[p.position] = (byPosition[p.position] ?? 0) + 1;
    });

    const avgRatingByTeam: Record<string, { sum: number; count: number }> = {};
    players.forEach((p) => {
      const team = p.team?.name ?? "Без команды";
      if (!avgRatingByTeam[team]) avgRatingByTeam[team] = { sum: 0, count: 0 };
      const ratings = p.coachRatings?.map((r) => r.rating) ?? [];
      if (ratings.length) {
        avgRatingByTeam[team].sum += ratings.reduce((a, b) => a + b, 0) / ratings.length;
        avgRatingByTeam[team].count += 1;
      }
    });

    const statsByPlayer = players.map((p) => {
      const stats = p.stats ?? [];
      const total = stats.reduce(
        (s, st) => ({ goals: s.goals + st.goals, assists: s.assists + st.assists, points: s.points + st.points, games: s.games + st.games }),
        { goals: 0, assists: 0, points: 0, games: 0 }
      );
      return {
        playerId: p.id,
        playerName: `${p.firstName} ${p.lastName}`,
        teamName: p.team?.name ?? "—",
        goals: total.goals,
        assists: total.assists,
        points: total.points,
        games: total.games,
      };
    });

    return NextResponse.json({
      byTeam: Object.entries(byTeam).map(([name, count]) => ({ name, count })),
      byPosition: Object.entries(byPosition).map(([name, count]) => ({ name, count })),
      avgRatingByTeam: Object.entries(avgRatingByTeam).map(([name, v]) => ({
        name,
        avg: v.count > 0 ? Math.round((v.sum / v.count) * 10) / 10 : 0,
      })),
      statsByPlayer,
    });
  } catch (err) {
    console.error("GET /api/analytics/players failed:", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
