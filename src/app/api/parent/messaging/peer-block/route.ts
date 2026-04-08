/**
 * POST /api/parent/messaging/peer-block
 * body: { blockedParentId: string, teamId: string }
 * Блокирует переписку parent_parent_direct с указанным родителем в команде.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentRole } from "@/lib/api-rbac";
import { parentsShareTeam } from "@/lib/messenger-parent-rules";

export async function POST(req: NextRequest) {
  const { user, res } = await requireParentRole(req);
  if (res) return res;
  const blockerId = user!.parentId!;

  try {
    const body = await req.json().catch(() => ({}));
    const blockedId =
      typeof body?.blockedParentId === "string"
        ? body.blockedParentId.trim()
        : "";
    const teamId =
      typeof body?.teamId === "string" ? body.teamId.trim() : "";
    if (!blockedId || !teamId) {
      return NextResponse.json(
        { error: "Укажите blockedParentId и teamId" },
        { status: 400 }
      );
    }
    if (blockedId === blockerId) {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
    }
    const share = await parentsShareTeam(blockerId, blockedId, teamId);
    if (!share) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const existing = await prisma.parentPeerBlock.findFirst({
      where: {
        blockerParentId: blockerId,
        blockedParentId: blockedId,
        teamContextId: teamId,
      },
      select: { id: true },
    });
    if (!existing) {
      await prisma.parentPeerBlock.create({
        data: {
          blockerParentId: blockerId,
          blockedParentId: blockedId,
          teamContextId: teamId,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/parent/messaging/peer-block failed:", e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
