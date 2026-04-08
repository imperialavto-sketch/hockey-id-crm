/**
 * PHASE 2 API LOCK — CANONICAL_MESSAGING_API (chat half: conversations + messages + read). (`docs/PHASE_2_API_ROUTE_LOCK.md`, `apiContours.ts`).
 * POST /api/chat/conversations/[id]/read
 * - Parent: помечает входящие сообщения прочитанными (как раньше).
 * - Coach: помечает сообщения от родителей прочитанными (синхронно с GET /api/coach/messages unreadCount).
 * Auth: session cookie или Bearer.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { checkChatConversationAccess } from "@/lib/chat-conversation-access";
import { MESSENGER_KIND } from "@/lib/messenger-kinds";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(_req);
  if (!user) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  if (!conversationId) {
    return NextResponse.json({ error: "ID чата обязателен" }, { status: 400 });
  }

  const access = await checkChatConversationAccess(conversationId, user);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.httpStatus }
    );
  }

  try {
    const kind = MESSENGER_KIND.COACH_PARENT_DIRECT;

    if (user.role === "PARENT" && user.parentId) {
      if (kind === MESSENGER_KIND.COACH_PARENT_DIRECT) {
        await prisma.chatMessage.updateMany({
          where: {
            conversationId,
            senderType: "coach",
            readAt: null,
          },
          data: { readAt: new Date() },
        });
      } else if (
        kind === MESSENGER_KIND.PARENT_PARENT_DIRECT ||
        kind === MESSENGER_KIND.TEAM_PARENT_CHANNEL
      ) {
        await prisma.chatMessage.updateMany({
          where: {
            conversationId,
            readAt: null,
            NOT: { senderId: user.parentId },
          },
          data: { readAt: new Date() },
        });
      } else if (kind === MESSENGER_KIND.TEAM_ANNOUNCEMENT_CHANNEL) {
        await prisma.chatMessage.updateMany({
          where: {
            conversationId,
            readAt: null,
            NOT: { senderId: user.parentId },
          },
          data: { readAt: new Date() },
        });
      }

      return NextResponse.json({ ok: true });
    }

    if (
      (user.role === "COACH" || user.role === "MAIN_COACH") &&
      user.teamId
    ) {
      if (
        kind === MESSENGER_KIND.COACH_PARENT_DIRECT ||
        kind === MESSENGER_KIND.TEAM_PARENT_CHANNEL
      ) {
        const pending = await prisma.chatMessage.count({
          where: {
            conversationId,
            senderType: "parent",
            readAt: null,
          },
        });
        if (pending === 0) {
          return NextResponse.json({ ok: true, updated: 0 });
        }
        const result = await prisma.chatMessage.updateMany({
          where: {
            conversationId,
            senderType: "parent",
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        return NextResponse.json({ ok: true, updated: result.count });
      }
      return NextResponse.json({ ok: true, updated: 0 });
    }

    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  } catch (error) {
    console.error("POST /api/chat/conversations/[id]/read failed:", error);
    return NextResponse.json(
      { error: "Не удалось обновить статус прочтения" },
      { status: 500 }
    );
  }
}
