/**
 * GET /api/players/[id]/attendance-summary?fromDate=&toDate=
 * Сводка посещаемости по TrainingSession (группа на неделю + отметки).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";
import { canParentAccessPlayer } from "@/lib/parent-access";
import {
  computePlayerAttendanceSummary,
  parseAttendanceSummaryRange,
} from "@/lib/player-attendance-summary";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const { id: playerId } = await params;
  if (!playerId) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }

  const url = new URL(req.url);
  const fromDate = url.searchParams.get("fromDate");
  const toDate = url.searchParams.get("toDate");
  const parsed = parseAttendanceSummaryRange(fromDate, toDate);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { rangeStart, rangeEndExclusive } = parsed;

  if (user.role === "PARENT" && user.parentId) {
    try {
      const canAccess = await canParentAccessPlayer(user.parentId, playerId);
      if (!canAccess) {
        return NextResponse.json({ error: "Нет доступа к игроку" }, { status: 403 });
      }
      const summary = await computePlayerAttendanceSummary(
        playerId,
        rangeStart,
        rangeEndExclusive
      );
      return NextResponse.json(summary);
    } catch (error) {
      console.error(
        "GET /api/players/[id]/attendance-summary (parent) failed:",
        error
      );
      return NextResponse.json(
        { error: "Ошибка загрузки сводки посещаемости" },
        { status: 500 }
      );
    }
  }

  const { user: u, res } = await requirePermission(req, "players", "view");
  if (res) return res;

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { team: true },
    });
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }
    const accessRes = checkPlayerAccess(u!, {
      ...player,
      team: player.team ?? undefined,
    });
    if (accessRes) return accessRes;

    const summary = await computePlayerAttendanceSummary(
      playerId,
      rangeStart,
      rangeEndExclusive
    );
    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/players/[id]/attendance-summary failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки сводки посещаемости" },
      { status: 500 }
    );
  }
}
