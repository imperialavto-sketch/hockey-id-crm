import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { rating, recommendation, comment } = body;

    const data: Record<string, unknown> = {};
    if (rating != null) {
      const r = parseInt(String(rating), 10);
      if (r >= 1 && r <= 5) data.rating = r;
    }
    if (recommendation !== undefined) data.recommendation = recommendation ? String(recommendation).trim() || null : null;
    if (comment !== undefined) data.comment = comment ? String(comment).trim() || null : null;

    const updated = await prisma.coachRating.update({
      where: { id },
      data,
      include: { player: { include: { team: true } }, coach: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/ratings/[id] failed:", err);
    return NextResponse.json({ error: "Ошибка обновления оценки" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.coachRating.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/ratings/[id] failed:", err);
    return NextResponse.json({ error: "Ошибка удаления оценки" }, { status: 500 });
  }
}
