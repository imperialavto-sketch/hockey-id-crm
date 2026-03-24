/**
 * GET /api/coach/teams
 * Coach-scoped teams list. Auth: Bearer (requireCrmRole).
 * Returns minimal shape for coach-app TeamCard/TeamHero.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessibleTeamIds } from "@/lib/data-scope";

export interface CoachTeamItem {
  id: string;
  name: string;
  level: string;
  playerCount: number;
  nextSession?: string;
  venue?: string;
  confirmed: number;
  expected: number;
}

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const teamIds = await getAccessibleTeamIds(user!, prisma);
    if (teamIds.length === 0) {
      return NextResponse.json([]);
    }

    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      include: {
        _count: { select: { players: true } },
        trainings: {
          where: { startTime: { gt: new Date() } },
          orderBy: { startTime: "asc" },
          take: 1,
          select: { startTime: true, location: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const items: CoachTeamItem[] = teams.map((t) => {
      const next = t.trainings[0];
      let nextSession: string | undefined;
      let venue: string | undefined;
      if (next) {
        nextSession = next.startTime.toLocaleDateString("ru-RU", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        venue = next.location ?? undefined;
      }
      const playerCount = t._count.players;
      return {
        id: t.id,
        name: t.name,
        level: t.ageGroup || "—",
        playerCount,
        nextSession,
        venue,
        confirmed: 0,
        expected: playerCount,
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/coach/teams failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки команд",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
