/**
 * GET /api/coach/schedule?weekStartDate=YYYY-MM-DD&teamId=
 * POST /api/coach/schedule — create TrainingSession
 * Source of truth: TrainingSession (coach-app weekly flow).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessibleTeamIds } from "@/lib/data-scope";
import { weekRangeFromParam } from "@/lib/schedule-week";
import {
  findTrainingSessionsForTeamWeek,
  sessionWeekInclude,
  toCoachTrainingSessionDto,
  type TrainingSessionWeekRow,
} from "@/lib/coach-training-session-dto";

import {
  normalizeTrainingSessionKind,
  parseTrainingSessionSubType,
} from "@/lib/training-session-helpers";

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

  const weekStartStr = req.nextUrl.searchParams.get("weekStartDate")?.trim();
  const teamIdParam = req.nextUrl.searchParams.get("teamId")?.trim();

  if (!weekStartStr) {
    return NextResponse.json(
      { error: "weekStartDate обязателен (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const range = weekRangeFromParam(weekStartStr);
  if (!range) {
    return NextResponse.json(
      { error: "Неверный формат weekStartDate" },
      { status: 400 }
    );
  }

  const teamIds = await getAccessibleTeamIds(user!, prisma);
  const teamId =
    teamIdParam || (teamIds && teamIds.length === 1 ? teamIds[0] : null);

  if (!teamId) {
    return NextResponse.json(
      { error: "teamId обязателен (или доступна ровно одна команда)" },
      { status: 400 }
    );
  }

  if (!canAccessTeam(teamIds, teamId)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  try {
    const rows = await findTrainingSessionsForTeamWeek(
      teamId,
      range.rangeStart,
      range.rangeEnd
    );
    return NextResponse.json(rows.map(toCoachTrainingSessionDto));
  } catch (error) {
    console.error("GET /api/coach/schedule failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки расписания" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Неверный JSON" },
      { status: 400 }
    );
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const teamId = typeof o.teamId === "string" ? o.teamId.trim() : "";
  const groupId = typeof o.groupId === "string" ? o.groupId.trim() : "";
  const type = typeof o.type === "string" ? o.type.trim().toLowerCase() : "";
  const startAtRaw = o.startAt;
  const endAtRaw = o.endAt;
  const locationName = typeof o.locationName === "string" ? o.locationName.trim() || null : null;
  const locationAddress = typeof o.locationAddress === "string" ? o.locationAddress.trim() || null : null;
  const notes = typeof o.notes === "string" ? o.notes.trim() || null : null;

  if (!teamId || !groupId || !type || !startAtRaw || !endAtRaw) {
    return NextResponse.json(
      { error: "Обязательны: teamId, groupId, type, startAt, endAt" },
      { status: 400 }
    );
  }

  const kind = normalizeTrainingSessionKind(type);
  if (!kind) {
    return NextResponse.json(
      { error: "type: ice | ofp (допустимы legacy: hockey, ofp, game, individual)" },
      { status: 400 }
    );
  }
  const subType = parseTrainingSessionSubType(o.subType);

  const startAt = startAtRaw instanceof Date ? startAtRaw : new Date(String(startAtRaw));
  const endAt = endAtRaw instanceof Date ? endAtRaw : new Date(String(endAtRaw));

  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return NextResponse.json(
      { error: "Неверный формат startAt или endAt" },
      { status: 400 }
    );
  }

  if (endAt.getTime() <= startAt.getTime()) {
    return NextResponse.json(
      { error: "endAt должен быть позже startAt" },
      { status: 400 }
    );
  }

  const teamIds = await getAccessibleTeamIds(user!, prisma);
  if (!canAccessTeam(teamIds, teamId)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  const group = await prisma.teamGroup.findFirst({
    where: { id: groupId, teamId, isActive: true },
  });

  if (!group) {
    return NextResponse.json(
      { error: "Группа не найдена или не принадлежит команде" },
      { status: 400 }
    );
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { coachId: true },
  });

  if (!team) {
    return NextResponse.json({ error: "Команда не найдена" }, { status: 400 });
  }

  const coachId = team.coachId;
  if (!coachId) {
    return NextResponse.json(
      { error: "У команды нет назначенного тренера" },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.trainingSession.create({
      data: {
        teamId,
        groupId,
        coachId,
        type: kind,
        subType,
        startAt,
        endAt,
        locationName,
        locationAddress,
        notes,
        status: "scheduled",
        sessionStatus: "planned",
      },
      include: sessionWeekInclude,
    });

    return NextResponse.json(
      toCoachTrainingSessionDto(created as TrainingSessionWeekRow)
    );
  } catch (error) {
    console.error("POST /api/coach/schedule failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка создания тренировки",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
