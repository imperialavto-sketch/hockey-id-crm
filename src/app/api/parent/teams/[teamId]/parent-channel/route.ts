/**
 * GET /api/parent/teams/[teamId]/parent-channel
 * Общий чат родителей команды (get or create).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireParentRole } from "@/lib/api-rbac";
import { canParentAccessTeam } from "@/lib/parent-access";
import { getOrCreateTeamParentChannel } from "@/lib/messenger-service";
import { MESSENGER_KIND } from "@/lib/messenger-kinds";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { user, res } = await requireParentRole(_req);
  if (res) return res;
  const parentId = user!.parentId!;
  const { teamId } = await params;
  if (!teamId?.trim()) {
    return NextResponse.json({ error: "teamId обязателен" }, { status: 400 });
  }
  if (!(await canParentAccessTeam(parentId, teamId))) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }
  try {
    const { id } = await getOrCreateTeamParentChannel(teamId);
    return NextResponse.json({
      ok: true,
      conversationId: id,
      conversationKind: MESSENGER_KIND.TEAM_PARENT_CHANNEL,
      teamId,
    });
  } catch (e) {
    console.error("GET parent-channel failed:", e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
