import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "trainings", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    let coachId = searchParams.get("coachId");

    if (!coachId) {
      const firstCoach = await prisma.coach.findFirst({
        where: { isMarketplaceIndependent: false },
      });
      coachId = firstCoach?.id ?? null;
    }

    if (!coachId) {
      return NextResponse.json([]);
    }

    const coachRow = await prisma.coach.findUnique({
      where: { id: coachId },
      select: { isMarketplaceIndependent: true },
    });
    if (coachRow?.isMarketplaceIndependent) {
      return NextResponse.json([]);
    }

    const teams = await prisma.team.findMany({
      where: { coachId },
      include: {
        trainings: {
          include: {
            attendances: { include: { player: true } },
          },
          orderBy: { startTime: "desc" },
        },
      },
    });

    const trainings = teams.flatMap((t) => t.trainings);
    return NextResponse.json(trainings);
  } catch (error) {
    console.error("GET /api/coach/trainings failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки занятий",
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
    const { title, durationMinutes, price, coachId: paramCoachId, startTime: paramStartTime } = body;

    if (!title || durationMinutes == null) {
      return NextResponse.json(
        { error: "Название и длительность обязательны" },
        { status: 400 }
      );
    }

    const duration = parseInt(String(durationMinutes), 10);
    if (isNaN(duration) || duration < 1) {
      return NextResponse.json(
        { error: "Некорректная длительность (минуты)" },
        { status: 400 }
      );
    }

    let coachId = paramCoachId;
    if (!coachId) {
      const firstCoach = await prisma.coach.findFirst({
        where: { isMarketplaceIndependent: false },
      });
      coachId = firstCoach?.id;
    }

    if (!coachId) {
      return NextResponse.json(
        { error: "Тренер не найден. Добавьте тренера в систему." },
        { status: 400 }
      );
    }

    const coachCheck = await prisma.coach.findUnique({
      where: { id: coachId },
      select: { isMarketplaceIndependent: true },
    });
    if (coachCheck?.isMarketplaceIndependent) {
      return NextResponse.json(
        { error: "Школьные занятия недоступны для независимого тренера маркетплейса" },
        { status: 400 }
      );
    }

    let targetTeam = await prisma.team.findFirst({
      where: { coachId },
    });

    if (!targetTeam) {
      const school = await prisma.school.findFirst();
      if (!school) {
        return NextResponse.json(
          { error: "Школа не найдена. Создайте школу и команду." },
          { status: 400 }
        );
      }
      targetTeam = await prisma.team.create({
        data: {
          name: "Занятия тренера",
          ageGroup: "Общие",
          schoolId: school.id,
          coachId,
        },
      });
    }
    if (!targetTeam) {
      return NextResponse.json({ error: "Не удалось найти команду тренера" }, { status: 500 });
    }

    const start = paramStartTime ? new Date(paramStartTime) : new Date();
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const notes = price != null ? `${duration} мин, ${Number(price)} ₽` : `${duration} мин`;

    const training = await prisma.training.create({
      data: {
        title: String(title).trim(),
        startTime: start,
        endTime: end,
        location: "Ледовая арена",
        teamId: targetTeam.id,
        notes,
      },
      include: {
        team: true,
        attendances: { include: { player: true } },
      },
    });

    return NextResponse.json(training);
  } catch (error) {
    console.error("POST /api/coach/trainings failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка создания занятия",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
