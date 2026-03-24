/**
 * GET /api/coach/players/[id]
 * Coach-scoped player detail. Auth: Bearer (requireCrmRole).
 * Returns shape for coach-app PlayerDetailHero and profile.
 * Notes fetched separately via /api/players/[id]/notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";

export interface CoachPlayerDetail {
  id: string;
  name: string;
  number: number;
  position: string;
  team: string;
  teamId: string | null;
  level: string;
  attendance: { attended: number; total: number; lastSession?: string };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }

  const accessibleIds = await getAccessiblePlayerIds(user!, prisma);
  if (!accessibleIds.includes(id)) {
    return NextResponse.json({ error: "Нет доступа к игроку" }, { status: 403 });
  }

  try {
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true, ageGroup: true } },
        profile: { select: { jerseyNumber: true } },
        _count: { select: { attendances: true } },
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const teamName = player.team?.name ?? "—";
    const teamId = player.team?.id ?? player.teamId ?? null;
    const level = player.team?.ageGroup ?? "—";

    const attendanceCount = player._count.attendances;
    const detail: CoachPlayerDetail = {
      id: player.id,
      name: [player.firstName, player.lastName].filter(Boolean).join(" ") || "Игрок",
      number: player.profile?.jerseyNumber ?? 0,
      position: player.position ?? "—",
      team: teamName,
      teamId,
      level,
      attendance: {
        attended: attendanceCount,
        total: attendanceCount,
      },
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error("GET /api/coach/players/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки игрока",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
