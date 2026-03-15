import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { requirePermission } from "@/lib/api-rbac";
import { sendPushToParents } from "@/lib/notifications/sendPush";
import { getParentIdsForTeam } from "@/lib/notifications/getParentsForTeam";

export async function GET(req: NextRequest) {
  const { user, res } = await requirePermission(req, "trainings", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    const where: Record<string, unknown> = {};
    if (user!.role === "MAIN_COACH" || user!.role === "COACH") {
      where.teamId = user!.teamId ?? null;
    } else if (user!.role === "SCHOOL_MANAGER" && user!.schoolId) {
      where.team = { schoolId: user!.schoolId };
    }
    if (teamId) {
      if (user!.role === "SCHOOL_ADMIN" || user!.role === "SCHOOL_MANAGER") {
        where.teamId = teamId;
      } else if ((user!.role === "MAIN_COACH" || user!.role === "COACH") && user!.teamId === teamId) {
        where.teamId = teamId;
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
  const { res } = await requirePermission(req, "trainings", "create");
  if (res) return res;
  try {
    const body = await req.json().catch(() => ({}));
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
