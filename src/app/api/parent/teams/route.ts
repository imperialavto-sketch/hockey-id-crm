/**
 * GET /api/parent/teams
 * Команды родителя (через детей).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentRole } from "@/lib/api-rbac";
import { getParentActiveTeamIds } from "@/lib/parent-team-ids";

export async function GET(req: NextRequest) {
  const { user, res } = await requireParentRole(req);
  if (res) return res;
  const parentId = user!.parentId!;
  try {
    const ids = await getParentActiveTeamIds(parentId);
    if (ids.length === 0) {
      return NextResponse.json({ teams: [] });
    }
    const teams = await prisma.team.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, ageGroup: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ teams });
  } catch (e) {
    console.error("GET /api/parent/teams failed:", e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
