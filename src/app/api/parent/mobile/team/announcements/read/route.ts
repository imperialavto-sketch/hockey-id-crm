/**
 * POST /api/parent/mobile/team/announcements/read
 * Body: { teamId?: string, playerId?: string } — один из идентификаторов нужен.
 * Помечает канал объявлений команды прочитанным (lastReadAt = now).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { canParentAccessTeam } from "@/lib/parent-access";
import { resolveTeamForParentAnnouncements } from "@/lib/parent-team-announcements";

export async function POST(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (user?.role !== "PARENT" || !user.parentId) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const teamIdRaw = typeof body.teamId === "string" ? body.teamId.trim() : "";
  const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";

  let teamId = teamIdRaw;

  if (!teamId) {
    if (!playerId) {
      return NextResponse.json(
        { error: "Укажите команду или выберите ребёнка в приложении", code: "team_required" },
        { status: 400 }
      );
    }
    const resolved = await resolveTeamForParentAnnouncements(user.parentId, {
      playerId,
      teamId: null,
    });
    if (!resolved.ok) {
      if (resolved.reason === "multi_team_choice_required") {
        return NextResponse.json(
          {
            error: "Несколько команд — выберите команду в канале объявлений",
            code: "multi_team",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Не удалось определить команду" },
        { status: 400 }
      );
    }
    teamId = resolved.teamId;
  }

  const allowed = await canParentAccessTeam(user.parentId, teamId);
  if (!allowed) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  const now = new Date();
  await prisma.parentTeamAnnouncementRead.upsert({
    where: {
      parentId_teamId: { parentId: user.parentId, teamId },
    },
    create: {
      parentId: user.parentId,
      teamId,
      lastReadAt: now,
    },
    update: { lastReadAt: now },
  });

  return NextResponse.json({ ok: true });
}
