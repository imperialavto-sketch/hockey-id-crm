/**
 * PATCH /api/groups/[id] — update group (name, level, sortOrder, isActive).
 * DELETE /api/groups/[id] — soft delete (isActive = false).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessibleTeamIds } from "@/lib/data-scope";

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
      sortOrder?: number;
      isActive?: boolean;
    } = {};

    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.level === "number" && Number.isFinite(body.level)) {
      data.level = Math.floor(body.level);
    }
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      data.sortOrder = Math.floor(body.sortOrder);
    }
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const updated = await prisma.teamGroup.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/groups/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка обновления группы" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id обязателен" }, { status: 400 });
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

    await prisma.teamGroup.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/groups/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка удаления группы" },
      { status: 500 }
    );
  }
}
