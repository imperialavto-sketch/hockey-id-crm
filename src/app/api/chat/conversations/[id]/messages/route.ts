/**
 * GET /api/chat/conversations/[id]/messages — list messages.
 * POST /api/chat/conversations/[id]/messages — send message.
 * Auth: parent or coach with access to conversation.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { sendPushToParent } from "@/lib/notifications/sendPush";

async function checkConversationAccess(
  conversationId: string,
  user: { role: string; parentId?: string | null; teamId?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const conv = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: { player: { select: { teamId: true } } },
  });

  if (!conv) return { ok: false, error: "Чат не найден" };

  if (user.role === "PARENT" && user.parentId) {
    if (conv.parentId !== user.parentId) return { ok: false, error: "Нет доступа" };
    return { ok: true };
  }

  if ((user.role === "COACH" || user.role === "MAIN_COACH") && user.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: user.teamId },
      select: { coachId: true },
    });
    if (team?.coachId !== conv.coachId) return { ok: false, error: "Нет доступа" };
    return { ok: true };
  }

  if (user.role === "SCHOOL_ADMIN" || user.role === "SCHOOL_MANAGER") {
    return { ok: true };
  }

  return { ok: false, error: "Нет доступа" };
}

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

  const { id: conversationId } = await params;
  if (!conversationId) {
    return NextResponse.json({ error: "ID чата обязателен" }, { status: 400 });
  }

  const access = await checkConversationAccess(conversationId, user);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error ?? "Нет доступа" },
      { status: access.error === "Чат не найден" ? 404 : 403 }
    );
  }

  try {
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    const mapped = messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderType: m.senderType as "parent" | "coach",
      senderId: m.senderId,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
      readAt: m.readAt?.toISOString() ?? null,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/chat/conversations/[id]/messages failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки сообщений", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}

export async function POST(
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

  const { id: conversationId } = await params;
  if (!conversationId) {
    return NextResponse.json({ error: "ID чата обязателен" }, { status: 400 });
  }

  const access = await checkConversationAccess(conversationId, user);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error ?? "Нет доступа" },
      { status: access.error === "Чат не найден" ? 404 : 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const text = body?.text;
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Текст сообщения обязателен" },
        { status: 400 }
      );
    }

    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv) {
      return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
    }

    let senderType: "parent" | "coach";
    let senderId: string;

    if (user.role === "PARENT" && user.parentId) {
      if (conv.parentId !== user.parentId) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
      }
      senderType = "parent";
      senderId = user.parentId;
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
      senderType = "coach";
      senderId = conv.coachId;
    } else if (user.role === "SCHOOL_ADMIN" || user.role === "SCHOOL_MANAGER") {
      senderType = "coach";
      senderId = conv.coachId;
    } else {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const msg = await prisma.chatMessage.create({
      data: {
        conversationId,
        senderType,
        senderId,
        text: text.trim(),
      },
    });

    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    if (senderType === "coach") {
      const preview = text.trim().slice(0, 80);
      void sendPushToParent(conv.parentId, {
        type: "chat_message",
        title: "Новое сообщение от тренера",
        body: preview + (text.trim().length > 80 ? "…" : ""),
        conversationId: conversationId,
        playerId: conv.playerId,
      });
    }

    return NextResponse.json({
      id: msg.id,
      conversationId: msg.conversationId,
      senderType: msg.senderType as "parent" | "coach",
      senderId: msg.senderId,
      text: msg.text,
      createdAt: msg.createdAt.toISOString(),
      readAt: msg.readAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("POST /api/chat/conversations/[id]/messages failed:", error);
    return NextResponse.json(
      { error: "Ошибка отправки сообщения", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
