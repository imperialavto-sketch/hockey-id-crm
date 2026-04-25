import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { canAccessTraining } from "@/lib/data-scope";
import { sendPushToParents } from "@/lib/notifications/sendPush";
import { getParentIdsForTeam } from "@/lib/notifications/getParentsForTeam";
import {
  normalizeTrainingSessionKind,
  parseTrainingSessionSubType,
  canUserAccessSessionTeam,
} from "@/lib/training-session-helpers";
import {
  sessionDetailInclude,
  detailRowToWeekRow,
  toCoachTrainingSessionDto,
} from "@/lib/coach-training-session-dto";
import type { TrainingSessionDetailRow } from "@/lib/coach-training-session-dto";
import { TRAINING_SESSION_NOT_FOUND_CODE } from "@/lib/trainings/training-session-errors";

/** Canonical schedule slot detail: only `TrainingSession`. Legacy `Training` uses `/api/legacy/trainings/*`. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "view");
  if (res) return res;
  try {
    const { id } = await params;

    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: sessionDetailInclude,
    });

    if (!session) {
      return NextResponse.json(
        {
          error: "training_session_not_found",
          code: TRAINING_SESSION_NOT_FOUND_CODE,
          message:
            "Слот расписания (TrainingSession) не найден. Legacy-модель Training не отдаётся по этому URL — используйте семейство /api/legacy/trainings/*.",
        },
        { status: 404 }
      );
    }

    if (
      !canUserAccessSessionTeam(user!, {
        teamId: session.teamId,
        team: { schoolId: session.team.schoolId },
      })
    ) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
    return NextResponse.json(
      toCoachTrainingSessionDto(detailRowToWeekRow(session as TrainingSessionDetailRow))
    );
  } catch (error) {
    console.error("GET /api/trainings/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки тренировки",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;
  try {
    const { id } = await params;
    const existing = await prisma.training.findUnique({ where: { id }, include: { team: true } });
    if (!existing) return NextResponse.json({ error: "Тренировка не найдена" }, { status: 404 });
    if (!canAccessTraining(user!, { ...existing, team: existing.team ?? undefined })) {
      return NextResponse.json({ error: "Нет доступа к тренировке" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const { title, startTime, endTime, location, teamId, notes } = body;

    const data: Record<string, unknown> = {};
    if (title != null) data.title = String(title).trim();
    if (startTime != null) {
      const d = new Date(startTime);
      if (!isNaN(d.getTime())) data.startTime = d;
    }
    if (endTime != null) {
      const d = new Date(endTime);
      if (!isNaN(d.getTime())) data.endTime = d;
    }
    if (location !== undefined) data.location = location ? String(location).trim() : null;
    if (teamId != null) data.teamId = String(teamId).trim();
    if (notes !== undefined) data.notes = notes ? String(notes).trim() : null;

    const training = await prisma.training.update({
      where: { id },
      data,
      include: { team: true },
    });

    if (training.teamId) {
      const parentIds = await getParentIdsForTeam(training.teamId);
      if (parentIds.length > 0) {
        const start = training.startTime;
        void sendPushToParents(parentIds, {
          type: "schedule_update",
          title: "Изменение расписания",
          body: `${training.title} — ${start.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}${training.location ? `, ${training.location}` : ""}`,
        });
      }
    }

    return NextResponse.json(training);
  } catch (error) {
    console.error("PUT /api/trainings/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка обновления тренировки" },
      { status: 500 }
    );
  }
}

/**
 * PATCH — обновление TrainingSession (MVP расписание по группам).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;
  try {
    const { id } = await params;

    const existing = await prisma.trainingSession.findUnique({
      where: { id },
      include: { team: { select: { schoolId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
    }

    if (
      !canUserAccessSessionTeam(user!, {
        teamId: existing.teamId,
        team: { schoolId: existing.team.schoolId },
      })
    ) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.type === "string") {
      const t = body.type.trim().toLowerCase();
      const kind = normalizeTrainingSessionKind(t);
      if (!kind) {
        return NextResponse.json(
          { error: "type: ice | ofp (или legacy hockey, ofp, game, individual)" },
          { status: 400 }
        );
      }
      data.type = kind;
    }
    if (body.subType !== undefined) {
      data.subType = parseTrainingSessionSubType(body.subType);
    }
    if (body.startAt != null) {
      const d = new Date(body.startAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Некорректный startAt" }, { status: 400 });
      }
      data.startAt = d;
    }
    if (body.endAt != null) {
      const d = new Date(body.endAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Некорректный endAt" }, { status: 400 });
      }
      data.endAt = d;
    }
    if (typeof body.locationName === "string") {
      data.locationName = body.locationName.trim() || null;
    }
    if (typeof body.locationAddress === "string") {
      data.locationAddress = body.locationAddress.trim() || null;
    }
    if (typeof body.notes === "string") {
      data.notes = body.notes.trim() || null;
    }
    if (typeof body.status === "string") {
      data.status = body.status.trim();
    }
    if (typeof body.groupId === "string" && body.groupId.trim()) {
      const gid = body.groupId.trim();
      const group = await prisma.teamGroup.findFirst({
        where: { id: gid, teamId: existing.teamId, isActive: true },
      });
      if (!group) {
        return NextResponse.json(
          { error: "Группа не найдена в этой команде" },
          { status: 400 }
        );
      }
      data.groupId = gid;
    }

    const startAt = (data.startAt as Date | undefined) ?? existing.startAt;
    const endAt = (data.endAt as Date | undefined) ?? existing.endAt;
    if (endAt.getTime() <= startAt.getTime()) {
      return NextResponse.json(
        { error: "endAt должен быть позже startAt" },
        { status: 400 }
      );
    }

    if (Object.keys(data).length === 0) {
      const unchanged = await prisma.trainingSession.findUnique({
        where: { id },
        include: sessionDetailInclude,
      });
      return NextResponse.json(
        toCoachTrainingSessionDto(
          detailRowToWeekRow(unchanged as TrainingSessionDetailRow)
        )
      );
    }

    const updated = await prisma.trainingSession.update({
      where: { id },
      data,
      include: sessionDetailInclude,
    });

    return NextResponse.json(
      toCoachTrainingSessionDto(
        detailRowToWeekRow(updated as TrainingSessionDetailRow)
      )
    );
  } catch (error) {
    console.error("PATCH /api/trainings/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка обновления сессии" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "delete");
  if (res) return res;
  try {
    const { id } = await params;

    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: { team: { select: { schoolId: true } } },
    });

    if (session) {
      if (
        !canUserAccessSessionTeam(user!, {
          teamId: session.teamId,
          team: { schoolId: session.team.schoolId },
        })
      ) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
      }
      await prisma.trainingSession.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    const existing = await prisma.training.findUnique({ where: { id }, include: { team: true } });
    if (!existing) return NextResponse.json({ error: "Тренировка не найдена" }, { status: 404 });
    if (!canAccessTraining(user!, { ...existing, team: existing.team ?? undefined })) {
      return NextResponse.json({ error: "Нет доступа к тренировке" }, { status: 403 });
    }
    await prisma.training.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/trainings/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка удаления тренировки" },
      { status: 500 }
    );
  }
}
