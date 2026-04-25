/**
 * Parent Mobile — re-run AI analysis for an existing PlayerVideoAnalysis row.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";
import { analyzeVideo } from "@/lib/ai/video-analysis";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; analysisId: string }> }
) {
  const { id: playerId, analysisId } = await params;
  if (!playerId || !analysisId) {
    return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
  }

  const user = await getAuthFromRequest(_req);
  if (user?.role !== "PARENT" || !user?.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const canAccess = await canParentAccessPlayer(user.parentId, playerId);
  if (!canAccess) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const existing = await prisma.playerVideoAnalysis.findFirst({
    where: { id: analysisId, playerId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Анализ не найден" }, { status: 404 });
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { team: true },
  });
  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  try {
    const analysis = await analyzeVideo({
      playerName: `${player.firstName} ${player.lastName}`,
      playerTeam: player.team?.name ?? "",
      videoDescription:
        existing.analysisText?.trim() ||
        "Повторный анализ по сохранённому описанию / контексту записи.",
    });

    await prisma.playerVideoAnalysis.update({
      where: { id: analysisId },
      data: {
        analysisText: analysis.summary,
        strengths: analysis.strengths,
        growthAreas: analysis.growthAreas,
        recommendations: analysis.recommendations,
      },
    });

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[video-analysis retry]", err);
    return NextResponse.json(
      {
        error: "Не удалось повторить анализ",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
