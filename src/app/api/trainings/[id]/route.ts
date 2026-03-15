import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { canAccessTraining } from "@/lib/data-scope";
import { sendPushToParents } from "@/lib/notifications/sendPush";
import { getParentIdsForTeam } from "@/lib/notifications/getParentsForTeam";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "view");
  if (res) return res;
  try {
    const { id } = await params;

    const training = await prisma.training.findUnique({
      where: { id },
      include: {
        team: { include: { coach: true } },
        attendances: { include: { player: true } },
      },
    });

    if (!training) {
      return NextResponse.json(
        { error: "Тренировка не найдена" },
        { status: 404 }
      );
    }

    if (!canAccessTraining(user!, { ...training, team: training.team ?? undefined })) {
      return NextResponse.json({ error: "Нет доступа к тренировке" }, { status: 403 });
    }

    return NextResponse.json(training);
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "delete");
  if (res) return res;
  try {
    const { id } = await params;
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
