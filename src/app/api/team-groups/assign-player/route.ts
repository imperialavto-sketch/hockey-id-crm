/**
 * POST /api/team-groups/assign-player
 * Body: { playerId: string, groupId: string | null, weekStartDate?: string }
 * weekStartDate — YYYY-MM-DD (нормализуется к понедельнику UTC), как на экране назначений по неделям.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds, getAccessibleTeamIds } from "@/lib/data-scope";
import { assignPlayerToTeamGroupMvp } from "@/lib/team-groups";
import { parseDateParamUTC } from "@/lib/schedule-week";

export async function POST(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const playerId =
    typeof body.playerId === "string" ? body.playerId.trim() : "";
  if (!playerId) {
    return NextResponse.json({ error: "playerId обязателен" }, { status: 400 });
  }

  let groupId: string | null;
  if (body.groupId === null) {
    groupId = null;
  } else if (typeof body.groupId === "string") {
    const t = body.groupId.trim();
    groupId = t === "" ? null : t;
  } else {
    return NextResponse.json(
      { error: "groupId: строка или null" },
      { status: 400 }
    );
  }

  let weekAnchorDate: Date | undefined;
  if (body.weekStartDate != null && body.weekStartDate !== "") {
    const raw =
      typeof body.weekStartDate === "string"
        ? body.weekStartDate.trim()
        : "";
    if (raw) {
      const parsed = parseDateParamUTC(raw);
      if (!parsed) {
        return NextResponse.json(
          { error: "weekStartDate: ожидается YYYY-MM-DD" },
          { status: 400 }
        );
      }
      weekAnchorDate = parsed;
    }
  }

  const scopedPlayerIds = await getAccessiblePlayerIds(user!, prisma);
  if (scopedPlayerIds !== null && !scopedPlayerIds.includes(playerId)) {
    return NextResponse.json({ error: "Нет доступа к игроку" }, { status: 403 });
  }

  const playerRow = await prisma.player.findUnique({
    where: { id: playerId },
    select: { teamId: true },
  });
  if (playerRow?.teamId) {
    const teamIds = await getAccessibleTeamIds(user!, prisma);
    if (teamIds !== null && !teamIds.includes(playerRow.teamId)) {
      return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
    }
  }

  const result = await assignPlayerToTeamGroupMvp({
    playerId,
    groupId,
    ...(weekAnchorDate ? { weekAnchorDate } : {}),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, playerId, groupId });
}
