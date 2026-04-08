/**
 * POST /api/parent/messages/report
 * body: { messageId: string, reason?: string }
 * Заготовка модерации: жалоба на сообщение в доступном родителю чате.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentRole } from "@/lib/api-rbac";
import { checkChatConversationAccess } from "@/lib/chat-conversation-access";

export async function POST(req: NextRequest) {
  const { user, res } = await requireParentRole(req);
  if (res) return res;
  const reporterId = user!.parentId!;

  try {
    const body = await req.json().catch(() => ({}));
    const messageId =
      typeof body?.messageId === "string" ? body.messageId.trim() : "";
    const reason =
      typeof body?.reason === "string" ? body.reason.trim().slice(0, 2000) : null;
    if (!messageId) {
      return NextResponse.json({ error: "Укажите messageId" }, { status: 400 });
    }

    const msg = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true },
    });
    if (!msg) {
      return NextResponse.json({ error: "Сообщение не найдено" }, { status: 404 });
    }

    const access = await checkChatConversationAccess(msg.conversationId, user!);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.httpStatus }
      );
    }

    const report = await prisma.chatMessageReport.create({
      data: {
        messageId: msg.id,
        reporterParentId: reporterId,
        reason: reason || null,
        status: "open",
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, reportId: report.id });
  } catch (e) {
    console.error("POST /api/parent/messages/report failed:", e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
