import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess, getAccessiblePlayerIds } from "@/lib/data-scope";
import { calculatePlayerRanking } from "@/lib/player-ranking";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "view");
  if (res) return res;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
    }

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        team: true,
        skills: true,
        coachRatings: { select: { rating: true } },
        attendances: { select: { status: true } },
        stats: true,
        achievements: { select: { id: true } },
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const accessRes = checkPlayerAccess(user!, {
      ...player,
      team: player.team ?? undefined,
    });
    if (accessRes) return accessRes;

    const ranking = calculatePlayerRanking({
      skills: player.skills ?? undefined,
      coachRatings: player.coachRatings,
      attendances: player.attendances,
      stats: player.stats,
      achievements: player.achievements,
    });

    const accessibleIds = await getAccessiblePlayerIds(user!, prisma);
    const allPlayers = await prisma.player.findMany({
      where: accessibleIds === null ? {} : { id: { in: accessibleIds } },
      include: {
        team: { select: { id: true } },
        skills: true,
        coachRatings: { select: { rating: true } },
        attendances: { select: { status: true } },
        stats: true,
        achievements: { select: { id: true } },
      },
    });

    const scored = allPlayers.map((p) => {
      const r = calculatePlayerRanking({
        skills: p.skills ?? undefined,
        coachRatings: p.coachRatings,
        attendances: p.attendances,
        stats: p.stats,
        achievements: p.achievements,
      });
      return {
        id: p.id,
        rankingScore: r.rankingScore,
        teamId: p.teamId,
        position: p.position,
        birthYear: p.birthYear,
      };
    });

    scored.sort((a, b) => b.rankingScore - a.rankingScore);

    const getRankInList = (list: typeof scored) => {
      const idx = list.findIndex((p) => p.id === id);
      return idx >= 0 ? idx + 1 : null;
    };

    const rankOverall = getRankInList(scored);
    const teamFiltered = player.teamId
      ? scored.filter((p) => p.teamId === player.teamId)
      : [];
    const rankInTeam = player.teamId ? getRankInList(teamFiltered) : null;
    const positionFiltered = scored.filter((p) => p.position === player.position);
    const rankByPosition = getRankInList(positionFiltered);
    const birthYearFiltered = scored.filter((p) => p.birthYear === player.birthYear);
    const rankByBirthYear = getRankInList(birthYearFiltered);

    return NextResponse.json({
      rankingScore: ranking.rankingScore,
      rankInTeam,
      rankByPosition,
      rankByBirthYear,
      rankOverall,
    });
  } catch (error) {
    console.error("GET /api/player/[id]/ranking failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка расчёта рейтинга игрока",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
