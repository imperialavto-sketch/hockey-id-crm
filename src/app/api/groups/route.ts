/**
 * GET /api/groups?teamId=
 * Schedule MVP — list groups for a team.
 * Auth: requireCrmRole. Team must be accessible.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessibleTeamIds } from "@/lib/data-scope";

function canAccessTeam(
  accessibleIds: string[] | null,
  teamId: string
): boolean {
  if (accessibleIds === null) return true;
  return accessibleIds.includes(teamId);
}

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const teamId = req.nextUrl.searchParams.get("teamId")?.trim();
  if (!teamId) {
    return NextResponse.json(
      { error: "teamId обязателен" },
      { status: 400 }
    );
  }

  const teamIds = await getAccessibleTeamIds(user!, prisma);
  if (!canAccessTeam(teamIds, teamId)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  try {
    const groups = await prisma.teamGroup.findMany({
      where: { teamId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("GET /api/groups failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки групп",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
