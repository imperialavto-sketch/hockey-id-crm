/**
 * POST /api/coach/schedule
 * Schedule MVP — create training session.
 * Auth: requireCrmRole. Coach can create only for accessible teams/groups.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessibleTeamIds } from "@/lib/data-scope";

const TRAINING_TYPES = ["hockey", "ofp", "game", "individual"] as const;

function canAccessTeam(
  accessibleIds: string[] | null,
  teamId: string
): boolean {
  if (accessibleIds === null) return true;
  return accessibleIds.includes(teamId);
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

  if (!TRAINING_TYPES.includes(type as (typeof TRAINING_TYPES)[number])) {
    return NextResponse.json(
      { error: "type должен быть: hockey, ofp, game, individual" },
      { status: 400 }
    );
  }

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
    const session = await prisma.trainingSession.create({
      data: {
        teamId,
        groupId,
        coachId,
        type,
        startAt,
        endAt,
        locationName,
        locationAddress,
        notes,
        status: "scheduled",
        sessionStatus: "planned",
      },
      include: {
        group: { select: { id: true, name: true, level: true } },
        coach: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({
      id: session.id,
      teamId: session.teamId,
      groupId: session.groupId,
      group: session.group,
      coachId: session.coachId,
      coach: session.coach,
      type: session.type,
      startAt: session.startAt.toISOString(),
      endAt: session.endAt.toISOString(),
      locationName: session.locationName,
      locationAddress: session.locationAddress,
      notes: session.notes,
      status: session.status,
      sessionStatus: session.sessionStatus,
    });
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
