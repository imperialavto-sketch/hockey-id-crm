/**
 * GET /api/chat/conversations/[id] — get single conversation.
 * Auth: parent (own) or coach (assigned).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID чата обязателен" }, { status: 400 });
  }

  try {
    const conv = await prisma.chatConversation.findUnique({
      where: { id },
      include: {
        player: { select: { firstName: true, lastName: true } },
        coach: { select: { firstName: true, lastName: true } },
        parent: { select: { firstName: true, lastName: true } },
      },
    });

    if (!conv) {
      return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
    }

    if (user.role === "PARENT" && user.parentId) {
      if (conv.parentId !== user.parentId) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
      }
    } else if (
      (user.role === "COACH" || user.role === "MAIN_COACH") &&
      user.teamId
    ) {
      const team = await prisma.team.findUnique({
        where: { id: user.teamId },
        select: { coachId: true },
      });
      if (team?.coachId !== conv.coachId) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
      }
    } else if (user.role !== "SCHOOL_ADMIN" && user.role !== "SCHOOL_MANAGER") {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    return NextResponse.json({
      id: conv.id,
      playerId: conv.playerId,
      playerName: `${conv.player.firstName} ${conv.player.lastName}`.trim(),
      coachId: conv.coachId,
      coachName: `${conv.coach.firstName} ${conv.coach.lastName}`.trim(),
      parentId: conv.parentId,
      parentName: `${conv.parent.firstName} ${conv.parent.lastName}`.trim(),
      updatedAt: conv.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("GET /api/chat/conversations/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки чата", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
