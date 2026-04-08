/**
 * PATCH /api/team-groups/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessibleTeamIds } from "@/lib/data-scope";
import { parseOptionalColorField } from "@/lib/team-groups";

function canAccessTeam(accessibleIds: string[] | null, teamId: string): boolean {
  if (accessibleIds === null) return true;
  return accessibleIds.includes(teamId);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }

  try {
    const existing = await prisma.teamGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
    }

    const teamIds = await getAccessibleTeamIds(user!, prisma);
    if (!canAccessTeam(teamIds, existing.teamId)) {
      return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
    }

    const data: {
      name?: string;
      level?: number;
      color?: string | null;
    } = {};

    if (typeof body.name === "string") data.name = body.name.trim();
    if (body.level === null) {
      data.level = 1;
    } else if (typeof body.level === "number" && Number.isFinite(body.level)) {
      data.level = Math.floor(body.level);
    }
    const colorParsed = parseOptionalColorField(body);
    if (colorParsed !== undefined) data.color = colorParsed;

    if (Object.keys(data).length === 0) {
      const g = await prisma.teamGroup.findUnique({
        where: { id },
        include: { _count: { select: { Player: true } } },
      });
      if (!g) {
        return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
      }
      return NextResponse.json({
        id: g.id,
        teamId: g.teamId,
        name: g.name,
        level: g.level,
        color: g.color ?? null,
        playersCount: g._count.Player,
        createdAt: g.createdAt.toISOString(),
      });
    }

    const updated = await prisma.teamGroup.update({
      where: { id },
      data,
      include: { _count: { select: { Player: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      teamId: updated.teamId,
      name: updated.name,
      level: updated.level,
      color: updated.color ?? null,
      playersCount: updated._count.Player,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("PATCH /api/team-groups/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка обновления группы" },
      { status: 500 }
    );
  }
}
