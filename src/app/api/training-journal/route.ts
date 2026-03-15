import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { trainingId, coachId, topic, goals, notes, teamComment } = body;

    if (!trainingId || !coachId) {
      return NextResponse.json(
        { error: "Тренировка и тренер обязательны" },
        { status: 400 }
      );
    }

    const created = await prisma.trainingJournal.upsert({
      where: {
        trainingId_coachId: {
          trainingId: String(trainingId),
          coachId: String(coachId),
        },
      },
      create: {
        trainingId: String(trainingId),
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
      include: { training: { include: { team: true } }, coach: true },
    });
    return NextResponse.json(created);
  } catch (err) {
    console.error("POST /api/training-journal failed:", err);
    return NextResponse.json({ error: "Ошибка сохранения журнала" }, { status: 500 });
  }
}
