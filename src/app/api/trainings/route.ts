import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { requirePermission } from "@/lib/api-rbac";
import { sendPushToParents } from "@/lib/notifications/sendPush";
import { getParentIdsForTeam } from "@/lib/notifications/getParentsForTeam";
import { weekRangeFromParam } from "@/lib/schedule-week";
import {
  normalizeTrainingSessionKind,
  parseTrainingSessionSubType,
  canUserAccessSessionTeam,
} from "@/lib/training-session-helpers";
import {
  findTrainingSessionsForTeamWeek,
  sessionWeekInclude,
  toCoachTrainingSessionDto,
  type TrainingSessionWeekRow,
} from "@/lib/coach-training-session-dto";

export async function GET(req: NextRequest) {
  const { user, res } = await requirePermission(req, "trainings", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const teamIdParam = searchParams.get("teamId");
    const weekStartStr = searchParams.get("weekStartDate")?.trim();

    /** Schedule MVP: TrainingSession for calendar week */
    if (weekStartStr) {
      const range = weekRangeFromParam(weekStartStr);
      if (!range) {
        return NextResponse.json(
          { error: "weekStartDate: ожидается YYYY-MM-DD" },
          { status: 400 }
        );
      }
      const teamId = teamIdParam?.trim();
      if (!teamId) {
        return NextResponse.json(
          { error: "teamId обязателен вместе с weekStartDate" },
          { status: 400 }
        );
      }

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { id: true, schoolId: true },
      });
      if (!team) {
        return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
      }
      if (
        !canUserAccessSessionTeam(user!, {
          teamId: team.id,
          team: { schoolId: team.schoolId },
        })
      ) {
        return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
      }

      const rows = await findTrainingSessionsForTeamWeek(
        teamId,
        range.rangeStart,
        range.rangeEnd
      );

      return NextResponse.json(rows.map(toCoachTrainingSessionDto));
    }

    const where: Prisma.TrainingWhereInput = {};
    if (user!.role === "MAIN_COACH" || user!.role === "COACH") {
      where.teamId = user!.teamId ?? undefined;
    } else if (user!.role === "SCHOOL_MANAGER" && user!.schoolId) {
      where.team = { schoolId: user!.schoolId };
    }
    if (teamIdParam) {
      if (user!.role === "SCHOOL_ADMIN" || user!.role === "SCHOOL_MANAGER") {
        where.teamId = teamIdParam;
      } else if (
        (user!.role === "MAIN_COACH" || user!.role === "COACH") &&
        user!.teamId === teamIdParam
      ) {
        where.teamId = teamIdParam;
      }
    }

    const trainings = await prisma.training.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: { team: { include: { coach: true } } },
      orderBy: { startTime: "desc" },
    });
    return NextResponse.json(trainings);
  } catch (error) {
    console.error("GET /api/trainings failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки тренировок",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { user, res } = await requirePermission(req, "trainings", "create");
  if (res) return res;
  try {
    const body = await req.json().catch(() => ({}));
    const groupId =
      typeof body?.groupId === "string" ? body.groupId.trim() : "";

    if (groupId) {
      const teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";
      const typeRaw = typeof body.type === "string" ? body.type.trim().toLowerCase() : "";
      const startAtRaw = body.startAt;
      const endAtRaw = body.endAt;
      const locationName =
        typeof body.locationName === "string"
          ? body.locationName.trim() || null
          : null;
      const locationAddress =
        typeof body.locationAddress === "string"
          ? body.locationAddress.trim() || null
          : null;
      const notes =
        typeof body.notes === "string" ? body.notes.trim() || null : null;

      if (!teamId || !typeRaw || !startAtRaw || !endAtRaw) {
        return NextResponse.json(
          { error: "Обязательны: teamId, groupId, type, startAt, endAt" },
          { status: 400 }
        );
      }
      const kind = normalizeTrainingSessionKind(typeRaw);
      if (!kind) {
        return NextResponse.json(
          { error: "type: ice | ofp (допустимы legacy: hockey, ofp, game, individual)" },
          { status: 400 }
        );
      }
      const subType = parseTrainingSessionSubType(body?.subType);

      const startAt =
        startAtRaw instanceof Date ? startAtRaw : new Date(String(startAtRaw));
      const endAt = endAtRaw instanceof Date ? endAtRaw : new Date(String(endAtRaw));
      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        return NextResponse.json(
          { error: "Некорректный формат startAt или endAt" },
          { status: 400 }
        );
      }
      if (endAt.getTime() <= startAt.getTime()) {
        return NextResponse.json(
          { error: "endAt должен быть позже startAt" },
          { status: 400 }
        );
      }

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { id: true, schoolId: true, coachId: true },
      });
      if (!team) {
        return NextResponse.json({ error: "Команда не найдена" }, { status: 400 });
      }
      if (
        !canUserAccessSessionTeam(user!, {
          teamId: team.id,
          team: { schoolId: team.schoolId },
        })
      ) {
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

      if (!team.coachId) {
        return NextResponse.json(
          { error: "У команды нет назначенного тренера" },
          { status: 400 }
        );
      }

      const session = await prisma.trainingSession.create({
        data: {
          teamId,
          groupId,
          coachId: team.coachId,
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
        toCoachTrainingSessionDto(session as TrainingSessionWeekRow)
      );
    }

    const { title, startTime, endTime, location, teamId, notes } = body;

    if (!title || !startTime || !endTime || !teamId) {
      return NextResponse.json(
        {
          error:
            "Название, время начала, время окончания и команда обязательны",
        },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Некорректный формат даты или времени" },
        { status: 400 }
      );
    }

    const teamIdStr = String(teamId).trim();
    const training = await prisma.training.create({
      data: {
        title: String(title).trim(),
        startTime: start,
        endTime: end,
        location: location ? String(location).trim() || null : null,
        teamId: teamIdStr,
        notes: notes ? String(notes).trim() || null : null,
      },
      include: { team: true },
    });

    const players = await prisma.player.findMany({
      where: { teamId: teamIdStr },
      include: { parent: true },
    });
    for (const p of players) {
      if (p.parentId) {
        await createNotification({
          type: "TRAINING_NEW",
          title: "Новая тренировка",
          body: `${training.title} — ${start.toLocaleString("ru-RU")}${training.location ? `, ${training.location}` : ""}`,
          link: "/parent",
          playerId: p.id,
          parentId: p.parentId,
        });
      }
    }

    return NextResponse.json(training);
  } catch (error) {
    console.error("POST /api/trainings failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка создания тренировки",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
