import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await ctx.params;
  const reportId = typeof id === "string" ? id.trim() : "";
  if (!reportId) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  try {
    const report = await prisma.report.findFirst({
      where: { id: reportId, coachId: user!.id },
    });
    if (!report) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    const player = report.playerId
      ? await prisma.player.findUnique({
          where: { id: report.playerId },
          select: { firstName: true, lastName: true },
        })
      : null;

    return NextResponse.json({
      id: report.id,
      coachId: report.coachId,
      playerId: report.playerId,
      playerName: player
        ? [player.firstName, player.lastName].filter(Boolean).join(" ").trim() || "Игрок"
        : null,
      title: report.title,
      content: report.content,
      createdAt: report.createdAt.toISOString(),
      voiceNoteId: report.voiceNoteId ?? null,
    });
  } catch (error) {
    console.error("GET /api/reports/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки отчёта",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

