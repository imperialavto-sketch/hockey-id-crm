import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { topic, goals, notes, teamComment } = body;

    const data: Record<string, unknown> = {};
    if (topic !== undefined) data.topic = topic ? String(topic).trim() || null : null;
    if (goals !== undefined) data.goals = goals ? String(goals).trim() || null : null;
    if (notes !== undefined) data.notes = notes ? String(notes).trim() || null : null;
    if (teamComment !== undefined) data.teamComment = teamComment ? String(teamComment).trim() || null : null;

    const updated = await prisma.trainingJournal.update({
      where: { id },
      data,
      include: { training: { include: { team: true } }, coach: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/training-journal/[id] failed:", err);
    return NextResponse.json({ error: "Ошибка обновления журнала" }, { status: 500 });
  }
}
