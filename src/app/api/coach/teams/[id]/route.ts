/**
 * GET /api/coach/teams/[id]
 * Coach-scoped team detail with roster. Auth: Bearer (requireCrmRole).
 * Returns shape for coach-app TeamDetailHero and roster.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessibleTeamIds } from "@/lib/data-scope";

export interface CoachTeamDetailRosterItem {
  id: string;
  name: string;
  number: number;
  position: string;
}

export interface CoachTeamDetail {
  id: string;
  name: string;
  level: string;
  playerCount: number;
  nextSession?: { date: string; time: string; venue: string; confirmed: number; expected: number };
  attendance: { attended: number; total: number };
  roster: CoachTeamDetailRosterItem[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID команды обязателен" }, { status: 400 });
  }

  const teamIds = await getAccessibleTeamIds(user!, prisma);
  if (teamIds !== null && !teamIds.includes(id)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        _count: { select: { players: true } },
        players: {
          include: { profile: true },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        },
        trainings: {
          where: { startTime: { gt: new Date() } },
          orderBy: { startTime: "asc" },
          take: 1,
          select: { startTime: true, location: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
    }

    const next = team.trainings[0];
    let nextSession: CoachTeamDetail["nextSession"];
    if (next) {
      nextSession = {
        date: next.startTime.toLocaleDateString("ru-RU", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        time: next.startTime.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        venue: next.location ?? "—",
        confirmed: 0,
        expected: team._count.players,
      };
    }

    const roster: CoachTeamDetailRosterItem[] = team.players.map((p) => ({
      id: p.id,
      name: [p.firstName, p.lastName].filter(Boolean).join(" ") || "Игрок",
      number: p.profile?.jerseyNumber ?? 0,
      position: p.position ?? "—",
    }));

    const detail: CoachTeamDetail = {
      id: team.id,
      name: team.name,
      level: team.ageGroup || "—",
      playerCount: team._count.players,
      nextSession,
      attendance: { attended: 0, total: team._count.players },
      roster,
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error("GET /api/coach/teams/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки команды",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
