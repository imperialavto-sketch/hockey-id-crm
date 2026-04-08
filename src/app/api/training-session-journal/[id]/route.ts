import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

/**
 * SESSION JOURNAL SSOT — partial update by journal row id (`TrainingSessionCoachJournal.id`).
 * LEGACY JOURNAL TRANSITIONAL — `PUT /api/training-journal/[id]` remains for `TrainingJournal`.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { topic, goals, notes, teamComment } = body;

    const existing = await prisma.trainingSessionCoachJournal.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Запись журнала не найдена" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (topic !== undefined) data.topic = topic ? String(topic).trim() || null : null;
    if (goals !== undefined) data.goals = goals ? String(goals).trim() || null : null;
    if (notes !== undefined) data.notes = notes ? String(notes).trim() || null : null;
    if (teamComment !== undefined) data.teamComment = teamComment ? String(teamComment).trim() || null : null;

    const updated = await prisma.trainingSessionCoachJournal.update({
      where: { id },
      data,
      include: {
        TrainingSession: { include: { team: true } },
        Coach: true,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/training-session-journal/[id] failed:", err);
    return NextResponse.json({ error: "Ошибка обновления журнала сессии" }, { status: 500 });
  }
}
