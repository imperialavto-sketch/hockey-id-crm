/**
 * POST /api/parent/messages/direct
 * body: { otherParentId: string, teamId: string }
 * Get or create parent_parent_direct в контексте команды.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireParentRole } from "@/lib/api-rbac";
import { getOrCreateParentParentConversation } from "@/lib/messenger-service";
import { MESSENGER_KIND } from "@/lib/messenger-kinds";

export async function POST(req: NextRequest) {
  const { user, res } = await requireParentRole(req);
  if (res) return res;
  const viewerId = user!.parentId!;

  try {
    const body = await req.json().catch(() => ({}));
    const otherParentId =
      typeof body?.otherParentId === "string" ? body.otherParentId.trim() : "";
    const teamId = typeof body?.teamId === "string" ? body.teamId.trim() : "";
    if (!otherParentId || !teamId) {
      return NextResponse.json(
        { error: "Укажите otherParentId и teamId" },
        { status: 400 }
      );
    }
    const { id } = await getOrCreateParentParentConversation(
      viewerId,
      otherParentId,
      teamId
    );
    return NextResponse.json({
      ok: true,
      conversationId: id,
      conversationKind: MESSENGER_KIND.PARENT_PARENT_DIRECT,
      teamId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "TEAM_SHARE_REQUIRED" || msg === "TEAM_ACCESS_DENIED") {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
    if (msg === "INVALID_PAIR") {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
    }
    if (msg === "PEER_BLOCKED") {
      return NextResponse.json({ error: "Переписка недоступна" }, { status: 403 });
    }
    console.error("POST /api/parent/messages/direct failed:", e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
