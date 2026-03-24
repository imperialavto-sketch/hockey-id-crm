/**
 * GET /api/coach/messages
 * Coach-app compatibility: list conversations for coach.
 * Maps ChatConversation + ChatMessage to ConversationApiItem[].
 * Auth: Bearer (requireCrmRole). Coach sees conversations for their team's coach.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    let coachId: string | null = null;

    if ((user!.role === "COACH" || user!.role === "MAIN_COACH") && user!.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: user!.teamId },
        select: { coachId: true },
      });
      coachId = team?.coachId ?? null;
      if (!coachId) return NextResponse.json([]);
    }

    const where = coachId
      ? { coachId }
      : {}; // SCHOOL_ADMIN / SCHOOL_MANAGER see all

    const list = await prisma.chatConversation.findMany({
      where,
      include: {
        player: { select: { firstName: true, lastName: true } },
        parent: { select: { firstName: true, lastName: true } },
        coach: { select: { firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { text: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const items = list.map((c) => {
      const playerName = `${c.player.firstName} ${c.player.lastName}`.trim();
      const parentName = `${c.parent.firstName} ${c.parent.lastName}`.trim();
      const lastMsg = c.messages[0];
      return {
        id: c.id,
        title: `${parentName} ↔ ${playerName}`,
        playerId: c.playerId,
        groupName: playerName,
        lastMessage: lastMsg?.text ?? undefined,
        lastMessageAt: lastMsg?.createdAt?.toISOString() ?? c.updatedAt.toISOString(),
        unreadCount: 0,
        participants: [parentName, c.coach.firstName + " " + c.coach.lastName],
        kind: "parent",
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/coach/messages failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки сообщений", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
