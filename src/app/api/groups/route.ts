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

/**
 * POST /api/groups — create group for team.
 */
export async function POST(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const level =
    typeof body.level === "number" && Number.isFinite(body.level)
      ? Math.floor(body.level)
      : 1;
  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.floor(body.sortOrder)
      : 0;

  if (!teamId || !name) {
    return NextResponse.json(
      { error: "teamId и name обязательны" },
      { status: 400 }
    );
  }

  const teamIds = await getAccessibleTeamIds(user!, prisma);
  if (!canAccessTeam(teamIds, teamId)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  try {
    const group = await prisma.teamGroup.create({
      data: {
        teamId,
        name,
        level,
        sortOrder,
        isActive: true,
      },
    });
    return NextResponse.json(group);
  } catch (error) {
    console.error("POST /api/groups failed:", error);
    return NextResponse.json(
      { error: "Ошибка создания группы" },
      { status: 500 }
    );
  }
}
