/**
 * GET /api/coach/conversations/[id]/ai-signals
 * Rule-based signals for coach thread UI (not messages API).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { checkCoachConversationAccess } from "@/lib/api/coach-conversation-access";
import { computeCoachConversationAiSignals } from "@/lib/messenger/coachConversationAiSignals";
import { loadCoachConversationAiSignalsContext } from "@/lib/messenger/coachConversationAiSignalsContext";

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

  const access = await checkCoachConversationAccess(id, user!);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  try {
    const [rows, hockeyCtx] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          text: true,
          senderType: true,
          createdAt: true,
        },
      }),
      loadCoachConversationAiSignalsContext(id),
    ]);

    const signals = computeCoachConversationAiSignals(id, rows, hockeyCtx);
    return NextResponse.json({ signals });
  } catch (error) {
    console.error("GET /api/coach/conversations/[id]/ai-signals failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки сигналов",
        details: error instanceof Error ? error.message : "",
      },
      { status: 500 }
    );
  }
}
