/**
 * GET /api/coach/messages/[id]
 * Coach-app compatibility: conversation detail with messages.
 * Maps ChatConversation + ChatMessage to ConversationDetailApiItem.
 * Auth: Bearer (requireCrmRole).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";

async function checkAccess(
  conversationId: string,
  user: { role: string; teamId?: string | null }
): Promise<{ ok: boolean; error?: string }> {
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
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID чата обязателен" }, { status: 400 });
  }

  const access = await checkAccess(id, user!);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error ?? "Нет доступа" },
      { status: access.error === "Чат не найден" ? 404 : 403 }
    );
  }

  try {
    const conv = await prisma.chatConversation.findUnique({
      where: { id },
      include: {
        player: { select: { firstName: true, lastName: true } },
        parent: { select: { firstName: true, lastName: true } },
        coach: { select: { firstName: true, lastName: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!conv) {
      return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
    }

    const playerName = `${conv.player.firstName} ${conv.player.lastName}`.trim();
    const parentName = `${conv.parent.firstName} ${conv.parent.lastName}`.trim();
    const coachName = `${conv.coach.firstName} ${conv.coach.lastName}`.trim();

    const messages = conv.messages.map((m) => {
      const isOwn = m.senderType === "coach";
      const senderName = m.senderType === "parent" ? parentName : coachName;
      return {
        id: m.id,
        senderName,
        senderRole: m.senderType,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
        isOwn,
      };
    });

    return NextResponse.json({
      id: conv.id,
      title: `${parentName} ↔ ${playerName}`,
      playerId: conv.playerId,
      groupName: playerName,
      participants: [parentName, coachName],
      messages,
    });
  } catch (error) {
    console.error("GET /api/coach/messages/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки чата", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
