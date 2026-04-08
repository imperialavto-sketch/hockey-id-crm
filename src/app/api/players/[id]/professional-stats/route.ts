/**
 * Hockey ID professional stats for CRM player card (tab hockeyIdStats).
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "view");
  if (res) return res;
  try {
    const { id } = await params;
    const player = await prisma.player.findUnique({
      where: { id },
      include: { team: true },
    });
    if (!player) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const [grouped, recentBehaviors, skillProgress, latestIndex, latestSnapshot] =
      await Promise.all([
        prisma.gameEvent.groupBy({
          by: ["type"],
          where: { playerId: id },
          _count: { _all: true },
        }),
        prisma.behaviorLog.findMany({
          where: { playerId: id },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            type: true,
            intensity: true,
            note: true,
            createdAt: true,
          },
        }),
        prisma.skillProgress.findMany({
          where: { playerId: id },
          orderBy: { measuredAt: "desc" },
          take: 15,
          select: {
            skill: true,
            status: true,
            trend: true,
            note: true,
            measuredAt: true,
          },
        }),
        prisma.playerIndex.findFirst({
          where: { playerId: id },
          orderBy: { calculatedAt: "desc" },
        }),
        prisma.playerStatsSnapshot.findFirst({
          where: { playerId: id },
          orderBy: { periodStart: "desc" },
        }),
      ]);

    const gameEventsByType: Record<string, number> = {};
    for (const row of grouped) {
      gameEventsByType[row.type] = row._count._all;
    }

    return NextResponse.json({
      gameEventsByType,
      recentBehaviors,
      skillProgress,
      latestIndex,
      latestSnapshot,
    });
  } catch (error) {
    console.error("GET /api/players/[id]/professional-stats failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки Hockey ID" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "edit");
  if (res) return res;
  try {
    const { id } = await params;
    const player = await prisma.player.findUnique({
      where: { id },
      include: { team: true },
    });
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const body = await req.json().catch(() => ({}));
    const kind = typeof body?.kind === "string" ? body.kind : "";

    if (kind === "gameEvent") {
      const eventType = typeof body?.eventType === "string" ? body.eventType.trim() : "";
      if (!eventType) {
        return NextResponse.json({ error: "Укажите тип события" }, { status: 400 });
      }
      const allowed = [
        "GOAL",
        "ASSIST",
        "SHOT",
        "TURNOVER",
        "TAKEAWAY",
        "ZONE_ENTRY_SUCCESS",
        "ZONE_ENTRY_FAIL",
        "PASS_SUCCESS",
        "PASS_FAIL",
        "GOOD_DECISION",
        "BAD_DECISION",
      ] as const;
      if (!allowed.includes(eventType as (typeof allowed)[number])) {
        return NextResponse.json({ error: "Недопустимый тип события" }, { status: 400 });
      }
      const note =
        typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null;
      let value: Prisma.Decimal | null = null;
      if (body?.value != null && body.value !== "") {
        const n = Number(body.value);
        if (Number.isFinite(n)) {
          value = new Prisma.Decimal(n);
        }
      }
      await prisma.gameEvent.create({
        data: {
          playerId: id,
          type: eventType as (typeof allowed)[number],
          value,
          note,
          source: "MANUAL",
          createdByUserId: user!.id,
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (kind === "behavior") {
      const behaviorType =
        typeof body?.behaviorType === "string" ? body.behaviorType.trim() : "";
      if (!behaviorType) {
        return NextResponse.json({ error: "Укажите тип поведения" }, { status: 400 });
      }
      const noteRaw = typeof body?.note === "string" ? body.note.trim() : "";
      if (!noteRaw) {
        return NextResponse.json({ error: "Кратко опишите наблюдение" }, { status: 400 });
      }
      const allowedB = [
        "GOOD_POSITIONING",
        "LOST_POSITION",
        "RETURNS_TO_DEFENSE",
        "IGNORES_TEAMPLAY",
        "ACTIVE_PLAY",
        "PASSIVE_PLAY",
        "GOOD_EFFORT",
        "LOW_ENGAGEMENT",
      ] as const;
      if (!allowedB.includes(behaviorType as (typeof allowedB)[number])) {
        return NextResponse.json({ error: "Недопустимый тип поведения" }, { status: 400 });
      }
      let intensity: "LOW" | "MEDIUM" | "HIGH" | null = null;
      if (typeof body?.intensity === "string") {
        const i = body.intensity.trim().toUpperCase();
        if (i === "LOW" || i === "MEDIUM" || i === "HIGH") intensity = i;
      }
      await prisma.behaviorLog.create({
        data: {
          playerId: id,
          type: behaviorType as (typeof allowedB)[number],
          intensity,
          note: noteRaw,
          source: "MANUAL",
          createdByUserId: user!.id,
        },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Неизвестный kind" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/players/[id]/professional-stats failed:", error);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}
