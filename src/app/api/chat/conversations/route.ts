/**
 * GET /api/chat/conversations — list conversations for parent or coach.
 * POST /api/chat/conversations — get or create conversation for parent (body: { playerId }).
 * Auth: CRM session or x-parent-id (parent mobile).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";
import { getOrCreateConversation } from "@/lib/chat";

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  try {
    if (user.role === "PARENT" && user.parentId) {
      const list = await prisma.chatConversation.findMany({
        where: { parentId: user.parentId },
        include: {
          player: { select: { firstName: true, lastName: true } },
          coach: { select: { firstName: true, lastName: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { text: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
      const mapped = list.map((c) => ({
        id: c.id,
        playerId: c.playerId,
        playerName: `${c.player.firstName} ${c.player.lastName}`.trim(),
        coachId: c.coachId,
        coachName: `${c.coach.firstName} ${c.coach.lastName}`.trim(),
        parentId: c.parentId,
        lastMessage: c.messages[0]?.text,
        updatedAt: c.updatedAt.toISOString(),
      }));
      return NextResponse.json(mapped);
    }

    if ((user.role === "COACH" || user.role === "MAIN_COACH") && user.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: user.teamId },
        select: { coachId: true },
      });
      const coachId = team?.coachId;
      if (!coachId) {
        return NextResponse.json([]);
      }
      const list = await prisma.chatConversation.findMany({
        where: { coachId },
        include: {
          player: { select: { firstName: true, lastName: true } },
          coach: { select: { firstName: true, lastName: true } },
          parent: { select: { firstName: true, lastName: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { text: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
      const mapped = list.map((c) => ({
        id: c.id,
        playerId: c.playerId,
        playerName: `${c.player.firstName} ${c.player.lastName}`.trim(),
        coachId: c.coachId,
        coachName: `${c.coach.firstName} ${c.coach.lastName}`.trim(),
        parentId: c.parentId,
        parentName: `${c.parent.firstName} ${c.parent.lastName}`.trim(),
        lastMessage: c.messages[0]?.text,
        updatedAt: c.updatedAt.toISOString(),
      }));
      return NextResponse.json(mapped);
    }

    if (user.role === "SCHOOL_ADMIN" || user.role === "SCHOOL_MANAGER") {
      const list = await prisma.chatConversation.findMany({
        include: {
          player: { select: { firstName: true, lastName: true } },
          coach: { select: { firstName: true, lastName: true } },
          parent: { select: { firstName: true, lastName: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { text: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
      const mapped = list.map((c) => ({
        id: c.id,
        playerId: c.playerId,
        playerName: `${c.player.firstName} ${c.player.lastName}`.trim(),
        coachId: c.coachId,
        coachName: `${c.coach.firstName} ${c.coach.lastName}`.trim(),
        parentId: c.parentId,
        parentName: `${c.parent.firstName} ${c.parent.lastName}`.trim(),
        lastMessage: c.messages[0]?.text,
        updatedAt: c.updatedAt.toISOString(),
      }));
      return NextResponse.json(mapped);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error("GET /api/chat/conversations failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки чатов", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  if (user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Доступно только родителям" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const playerId = body?.playerId;
    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json(
        { error: "Укажите playerId" },
        { status: 400 }
      );
    }

    const canAccess = await canParentAccessPlayer(user.parentId, playerId);
    if (!canAccess) {
      return NextResponse.json(
        { error: "Нет доступа к этому игроку" },
        { status: 403 }
      );
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { team: { select: { coachId: true } } },
    });

    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const coachId = player.team?.coachId;
    if (!coachId) {
      return NextResponse.json(
        { error: "У команды игрока нет назначенного тренера" },
        { status: 400 }
      );
    }

    const conv = await getOrCreateConversation(
      user.parentId,
      coachId,
      playerId
    );

    return NextResponse.json({
      id: conv.id,
      playerId: conv.playerId,
      playerName: `${conv.player.firstName} ${conv.player.lastName}`.trim(),
      coachId: conv.coachId,
      coachName: `${conv.coach.firstName} ${conv.coach.lastName}`.trim(),
      parentId: conv.parentId,
      lastMessage: undefined,
      updatedAt: conv.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/chat/conversations failed:", error);
    return NextResponse.json(
      { error: "Ошибка создания чата", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
