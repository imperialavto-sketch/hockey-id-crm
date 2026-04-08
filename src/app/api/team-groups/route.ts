/**
 * GET /api/team-groups?teamId=
 * POST /api/team-groups — создать группу (MVP контракт).
 * Auth: requireCrmRole.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessibleTeamIds } from "@/lib/data-scope";
import { listActiveTeamGroupsWithCounts } from "@/lib/team-groups";

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
    return NextResponse.json({ error: "teamId обязателен" }, { status: 400 });
  }

  const teamIds = await getAccessibleTeamIds(user!, prisma);
  if (!canAccessTeam(teamIds, teamId)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  try {
    const items = await listActiveTeamGroupsWithCounts(teamId);
    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/team-groups failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки групп",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

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
    body.level === null || body.level === undefined
      ? 1
      : typeof body.level === "number" && Number.isFinite(body.level)
        ? Math.floor(body.level)
        : null;
  if (level === null) {
    return NextResponse.json(
      { error: "level: число или null" },
      { status: 400 }
    );
  }

  let color: string | null = null;
  if (body.color === null) color = null;
  else if (typeof body.color === "string") {
    const t = body.color.trim();
    color = t === "" ? null : t;
  } else if (body.color !== undefined) {
    return NextResponse.json(
      { error: "color: строка, null или опустить" },
      { status: 400 }
    );
  }

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
    const created = await prisma.teamGroup.create({
      data: {
        teamId,
        name,
        level,
        sortOrder: 0,
        isActive: true,
        color,
      },
      include: { _count: { select: { Player: true } } },
    });

    return NextResponse.json({
      id: created.id,
      teamId: created.teamId,
      name: created.name,
      level: created.level,
      color: created.color ?? null,
      playersCount: created._count.Player,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/team-groups failed:", error);
    return NextResponse.json(
      { error: "Ошибка создания группы" },
      { status: 500 }
    );
  }
}
