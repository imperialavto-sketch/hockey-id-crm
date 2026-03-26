/**
 * GET /api/parent/mobile/player/[id]/materials
 * Parent-scoped coach materials (Report, ActionItem, standalone ParentDraft) for one player.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";

const TAKE = 5;

function preview(text: string, maxLen = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }

  const player = await prisma.player.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  const user = await getAuthFromRequest(req);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const canAccess = await canParentAccessPlayer(user.parentId, id);
  if (!canAccess) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const [reports, actions, parentDrafts] = await Promise.all([
      prisma.report.findMany({
        where: { playerId: id },
        orderBy: { createdAt: "desc" },
        take: TAKE,
      }),
      prisma.actionItem.findMany({
        where: { playerId: id },
        orderBy: { createdAt: "desc" },
        take: TAKE,
      }),
      prisma.parentDraft.findMany({
        where: { playerId: id },
        orderBy: { createdAt: "desc" },
        take: TAKE,
      }),
    ]);

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        playerId: r.playerId,
        title: r.title,
        contentPreview: preview(r.content),
        createdAt: r.createdAt.toISOString(),
        voiceNoteId: r.voiceNoteId ?? null,
      })),
      actions: actions.map((a) => ({
        id: a.id,
        playerId: a.playerId,
        title: a.title,
        descriptionPreview: preview(a.description),
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        voiceNoteId: a.voiceNoteId ?? null,
      })),
      parentDrafts: parentDrafts.map((d) => ({
        id: d.id,
        playerId: d.playerId,
        textPreview: preview(d.text ?? ""),
        createdAt: d.createdAt.toISOString(),
        voiceNoteId: d.voiceNoteId ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/parent/mobile/player/[id]/materials failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки материалов",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
