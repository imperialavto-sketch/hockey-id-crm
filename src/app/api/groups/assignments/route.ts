/**
 * GET /api/groups/assignments?teamId=&weekStartDate=
 * Weekly player ↔ group assignments for a team.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessibleTeamIds } from "@/lib/data-scope";
import { parseDateParamUTC, toWeekStartUTC } from "@/lib/schedule-week";

function canAccessTeam(accessibleIds: string[] | null, teamId: string): boolean {
  if (accessibleIds === null) return true;
  return accessibleIds.includes(teamId);
}

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const teamId = req.nextUrl.searchParams.get("teamId")?.trim();
  const weekRaw = req.nextUrl.searchParams.get("weekStartDate")?.trim();

  if (!teamId || !weekRaw) {
    return NextResponse.json(
      { error: "teamId и weekStartDate обязательны" },
      { status: 400 }
    );
  }

  const parsed = parseDateParamUTC(weekRaw);
  if (!parsed) {
    return NextResponse.json(
      { error: "weekStartDate: ожидается YYYY-MM-DD" },
      { status: 400 }
    );
  }
  const weekStartDate = toWeekStartUTC(parsed);

  const teamIds = await getAccessibleTeamIds(user!, prisma);
  if (!canAccessTeam(teamIds, teamId)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  try {
    const assignments = await prisma.playerGroupAssignment.findMany({
      where: {
        weekStartDate,
        player: { teamId },
      },
      include: {
        group: { select: { id: true, name: true, level: true } },
        player: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ player: { lastName: "asc" } }, { player: { firstName: "asc" } }],
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("GET /api/groups/assignments failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки назначений" },
      { status: 500 }
    );
  }
}
