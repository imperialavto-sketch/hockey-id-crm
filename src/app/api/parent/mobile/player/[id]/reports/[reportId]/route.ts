/**
 * GET /api/parent/mobile/player/[id]/reports/[reportId]
 * Full coach Report for parent (CRM), scoped to player.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";

export async function GET(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id: playerId, reportId } = await params;
  const pid = typeof playerId === "string" ? playerId.trim() : "";
  const rid = typeof reportId === "string" ? reportId.trim() : "";

  if (!pid) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }
  if (!rid) {
    return NextResponse.json({ error: "ID отчёта обязателен" }, { status: 400 });
  }

  const player = await prisma.player.findUnique({
    where: { id: pid },
    select: { id: true },
  });
  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  const user = await getAuthFromRequest(_req);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const canAccess = await canParentAccessPlayer(user.parentId, pid);
  if (!canAccess) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const report = await prisma.report.findFirst({
      where: {
        id: rid,
        playerId: pid,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 });
    }

    return NextResponse.json({
      id: report.id,
      playerId: report.playerId,
      title: report.title,
      content: report.content,
      createdAt: report.createdAt.toISOString(),
      voiceNoteId: report.voiceNoteId ?? null,
    });
  } catch (error) {
    console.error(
      "GET /api/parent/mobile/player/[id]/reports/[reportId] failed:",
      error
    );
    return NextResponse.json(
      {
        error: "Ошибка загрузки отчёта",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
