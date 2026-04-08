import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

/**
 * SESSION JOURNAL SSOT — upsert by `trainingSessionId` + `coachId` (FK to `TrainingSession` + `Coach`).
 * LEGACY JOURNAL TRANSITIONAL — `POST /api/training-journal` remains for legacy `Training.id`.
 * NO AUTO-BACKFILL between stores.
 */
export async function POST(req: NextRequest) {
  const { res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;
  try {
    const body = await req.json().catch(() => ({}));
    const { trainingSessionId, coachId, topic, goals, notes, teamComment } = body;

    if (!trainingSessionId || !coachId) {
      return NextResponse.json(
        { error: "Тренировка (сессия) и тренер обязательны" },
        { status: 400 }
      );
    }

    const session = await prisma.trainingSession.findFirst({
      where: {
        id: String(trainingSessionId),
        team: { coachId: String(coachId) },
      },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Сессия не найдена или нет доступа для этого тренера" },
        { status: 404 }
      );
    }

    const created = await prisma.trainingSessionCoachJournal.upsert({
      where: {
        trainingSessionId_coachId: {
          trainingSessionId: String(trainingSessionId),
          coachId: String(coachId),
        },
      },
      create: {
        trainingSessionId: String(trainingSessionId),
        coachId: String(coachId),
        topic: topic ? String(topic).trim() || null : null,
        goals: goals ? String(goals).trim() || null : null,
        notes: notes ? String(notes).trim() || null : null,
        teamComment: teamComment ? String(teamComment).trim() || null : null,
      },
      update: {
        topic: topic ? String(topic).trim() || null : null,
        goals: goals ? String(goals).trim() || null : null,
        notes: notes ? String(notes).trim() || null : null,
        teamComment: teamComment ? String(teamComment).trim() || null : null,
      },
      include: {
        TrainingSession: { include: { team: true } },
        Coach: true,
      },
    });
    return NextResponse.json(created);
  } catch (err) {
    console.error("POST /api/training-session-journal failed:", err);
    return NextResponse.json({ error: "Ошибка сохранения журнала сессии" }, { status: 500 });
  }
}
