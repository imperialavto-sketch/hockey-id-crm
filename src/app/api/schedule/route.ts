/**
 * GET /api/schedule?date=YYYY-MM-DD&teamId=
 * GET /api/schedule?weekStartDate=YYYY-MM-DD&teamId=
 * Schedule MVP — TrainingSession (backward-compatible для CRM; coach-app → /api/coach/schedule).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessibleTeamIds } from "@/lib/data-scope";
import { parseDateParamUTC, weekRangeFromParam } from "@/lib/schedule-week";
import {
  findTrainingSessionsForTeamWeek,
  toCoachTrainingSessionDto,
} from "@/lib/coach-training-session-dto";

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
    const range = weekRangeFromParam(inputStr);
    if (!range) {
      return NextResponse.json(
        { error: "Неверный формат даты" },
        { status: 400 }
      );
    }
    rangeStart = range.rangeStart;
    rangeEnd = range.rangeEnd;
  } else {
    const parsed = parseDateParamUTC(inputStr);
    if (!parsed) {
      return NextResponse.json(
        { error: "Неверный формат даты" },
        { status: 400 }
      );
    }
    rangeStart = new Date(parsed);
    rangeStart.setUTCHours(0, 0, 0, 0);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);
  }

  try {
    const rows = await findTrainingSessionsForTeamWeek(
      teamId,
      rangeStart,
      rangeEnd
    );
    return NextResponse.json(rows.map(toCoachTrainingSessionDto));
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
