/**
 * GET /api/coach/players
 * Coach-scoped players list. Auth: Bearer (requireCrmRole).
 * Optional ?teamId= filter. Returns minimal shape for coach-app PlayerCard.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";

export interface CoachPlayerItem {
  id: string;
  name: string;
  number: number;
  position: string;
  team: string;
  teamId: string | null;
  /** Team age group (e.g. U12, U14) for filtering. From Team.ageGroup. */
  teamAgeGroup?: string | null;
  attendance?: string;
  coachNote?: string;
}

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const accessibleIds = await getAccessiblePlayerIds(user!, prisma);
    if (accessibleIds.length === 0) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId")?.trim() || null;

    const where: { id: { in: string[] }; teamId?: string | null } = {
      id: { in: accessibleIds },
    };
    if (teamId) where.teamId = teamId;

    const players = await prisma.player.findMany({
      where,
      include: {
        team: { select: { id: true, name: true, ageGroup: true } },
        profile: { select: { jerseyNumber: true } },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { note: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const items: CoachPlayerItem[] = players.map((p) => {
      const teamName = p.team?.name ?? "—";
      const teamIdVal = p.team?.id ?? p.teamId ?? null;
      const teamAgeGroup = p.team?.ageGroup ?? null;
      const latestNote = p.notes[0]?.note;
      const coachNote = latestNote
        ? latestNote.length > 80
          ? latestNote.slice(0, 77) + "..."
          : latestNote
        : undefined;
      return {
        id: p.id,
        name: [p.firstName, p.lastName].filter(Boolean).join(" ") || "Игрок",
        number: p.profile?.jerseyNumber ?? 0,
        position: p.position ?? "—",
        team: teamName,
        teamId: teamIdVal,
        teamAgeGroup,
        coachNote,
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/coach/players failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки игроков",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
