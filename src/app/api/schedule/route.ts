/**
 * GET /api/schedule?date=YYYY-MM-DD&teamId=
 * GET /api/schedule?weekStartDate=YYYY-MM-DD&teamId=
 * Schedule MVP — training sessions. Weekly planning model.
 * date: single day. weekStartDate: Monday of week, returns 7 days.
 * Auth: requireCrmRole. teamId optional; defaults to coach's team.
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

function parseDateParam(dateStr: string): Date | null {
  const d = new Date(dateStr + "T00:00:00.000Z");
  return isNaN(d.getTime()) ? null : d;
}

/** Normalize to Monday 00:00 UTC */
function toWeekStart(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const dateStr = req.nextUrl.searchParams.get("date")?.trim();
  const weekStartStr = req.nextUrl.searchParams.get("weekStartDate")?.trim();
  const teamIdParam = req.nextUrl.searchParams.get("teamId")?.trim();

  const isWeekly = !!weekStartStr;
  const inputStr = isWeekly ? weekStartStr : dateStr;

  if (!inputStr) {
    return NextResponse.json(
      { error: "date или weekStartDate обязателен (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const parsed = parseDateParam(inputStr);
  if (!parsed) {
    return NextResponse.json(
      { error: "Неверный формат даты" },
      { status: 400 }
    );
  }

  const teamIds = await getAccessibleTeamIds(user!, prisma);
  const teamId = teamIdParam || (teamIds && teamIds.length === 1 ? teamIds[0] : null);

  if (!teamId) {
    return NextResponse.json(
      { error: "teamId обязателен (или укажите команду)" },
      { status: 400 }
    );
  }

  if (!canAccessTeam(teamIds, teamId)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  let rangeStart: Date;
  let rangeEnd: Date;
  if (isWeekly) {
    rangeStart = toWeekStart(parsed);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 7);
  } else {
    rangeStart = new Date(parsed);
    rangeStart.setUTCHours(0, 0, 0, 0);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);
  }

  try {
    const sessions = await prisma.trainingSession.findMany({
      where: {
        teamId,
        status: { not: "cancelled" },
        startAt: { gte: rangeStart, lt: rangeEnd },
      },
      include: {
        group: { select: { id: true, name: true, level: true } },
        coach: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startAt: "asc" },
    });

    const items = sessions.map((s) => ({
      id: s.id,
      teamId: s.teamId,
      groupId: s.groupId,
      group: s.group,
      coachId: s.coachId,
      coach: s.coach,
      type: s.type,
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      locationName: s.locationName,
      locationAddress: s.locationAddress,
      notes: s.notes,
      status: s.status,
      sessionStatus: s.sessionStatus,
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/schedule failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки расписания",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
