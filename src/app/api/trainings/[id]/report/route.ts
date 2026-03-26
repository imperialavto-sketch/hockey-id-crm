import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { canUserAccessSessionTeam } from "@/lib/training-session-helpers";

const MAX_FIELD_LEN = 8000;

function trimField(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > MAX_FIELD_LEN ? t.slice(0, MAX_FIELD_LEN) : t;
}

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
      include: { team: { select: { schoolId: true } } },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Тренировка не найдена" },
        { status: 404 }
      );
    }

    if (!canUserAccessSessionTeam(user!, session)) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const report = await prisma.trainingSessionReport.findUnique({
      where: { trainingId: id },
    });

    return NextResponse.json({
      trainingId: id,
      summary: report?.summary ?? null,
      focusAreas: report?.focusAreas ?? null,
      coachNote: report?.coachNote ?? null,
      parentMessage: report?.parentMessage ?? null,
      updatedAt: report?.updatedAt.toISOString() ?? null,
    });
  } catch (error) {
    console.error("GET /api/trainings/[id]/report failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки отчёта" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;

  try {
    const { id } = await params;
    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: { team: { select: { schoolId: true } } },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Тренировка не найдена" },
        { status: 404 }
      );
    }

    if (!canUserAccessSessionTeam(user!, session)) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Некорректное тело запроса" },
        { status: 400 }
      );
    }

    const summary = trimField(body.summary);
    const focusAreas = trimField(body.focusAreas);
    const coachNote = trimField(body.coachNote);
    const parentMessage = trimField(body.parentMessage);

    const report = await prisma.trainingSessionReport.upsert({
      where: { trainingId: id },
      create: {
        trainingId: id,
        summary,
        focusAreas,
        coachNote,
        parentMessage,
      },
      update: {
        summary,
        focusAreas,
        coachNote,
        parentMessage,
      },
    });

    return NextResponse.json({
      trainingId: id,
      summary: report.summary,
      focusAreas: report.focusAreas,
      coachNote: report.coachNote,
      parentMessage: report.parentMessage,
      updatedAt: report.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/trainings/[id]/report failed:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения отчёта" },
      { status: 500 }
    );
  }
}
