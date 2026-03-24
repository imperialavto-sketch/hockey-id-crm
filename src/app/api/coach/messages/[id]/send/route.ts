/**
 * POST /api/coach/messages/[id]/send
 * Coach-app compatibility: send message in conversation.
 * Proxies to ChatMessage creation. Returns SendMessageApiResponse shape.
 * Auth: Bearer (requireCrmRole).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { sendPushToParent } from "@/lib/notifications/sendPush";

async function checkAccess(
  conversationId: string,
  user: { role: string; teamId?: string | null }
): Promise<{ ok: boolean; conv?: { id: string; parentId: string; playerId: string; coachId: string }; error?: string }> {
  const conv = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
  });
  if (!conv) return { ok: false, error: "Чат не найден" };

  if ((user.role === "COACH" || user.role === "MAIN_COACH") && user.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: user.teamId },
      select: { coachId: true },
    });
    if (team?.coachId !== conv.coachId) return { ok: false, error: "Нет доступа" };
    return { ok: true, conv };
  }

  if (user.role === "SCHOOL_ADMIN" || user.role === "SCHOOL_MANAGER") {
    return { ok: true, conv };
  }

  return { ok: false, error: "Нет доступа" };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id: conversationId } = await params;
  if (!conversationId) {
    return NextResponse.json({ error: "ID чата обязателен" }, { status: 400 });
  }

  const access = await checkAccess(conversationId, user!);
  if (!access.ok || !access.conv) {
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

    const conv = access.conv;
    const coachId = conv.coachId;

    const msg = await prisma.chatMessage.create({
      data: {
        conversationId,
        senderType: "coach",
        senderId: coachId,
        text: text.trim(),
      },
    });

    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const coach = await prisma.coach.findUnique({
      where: { id: coachId },
      select: { firstName: true, lastName: true },
    });
    const senderName = coach ? `${coach.firstName} ${coach.lastName}`.trim() : "Тренер";

    void sendPushToParent(conv.parentId, {
      type: "chat_message",
      title: "Новое сообщение от тренера",
      body: text.trim().slice(0, 80) + (text.trim().length > 80 ? "…" : ""),
      conversationId,
      playerId: conv.playerId,
    });

    return NextResponse.json({
      id: msg.id,
      senderName,
      senderRole: "coach",
      text: msg.text,
      createdAt: msg.createdAt.toISOString(),
      isOwn: true,
    });
  } catch (error) {
    console.error("POST /api/coach/messages/[id]/send failed:", error);
    return NextResponse.json(
      { error: "Ошибка отправки сообщения", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
