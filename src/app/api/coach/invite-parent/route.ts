/**
 * POST /api/coach/invite-parent
 * Coach invites a parent by phone. Creates ParentInvite record.
 * On parent login with that phone, they will be linked to the player via ParentPlayer.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

function normalizePhone(phone: string): string {
  return String(phone ?? "").replace(/\D/g, "").trim();
}

export async function POST(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const body = await req.json().catch(() => ({}));
    const { phone, playerId } = body;
    const normalized = normalizePhone(phone);

    if (!normalized) {
      return NextResponse.json(
        { error: "Введите номер телефона" },
        { status: 400 }
      );
    }
    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json(
        { error: "Укажите игрока" },
        { status: 400 }
      );
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { team: true },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Игрок не найден" },
        { status: 404 }
      );
    }

    const accessRes = checkPlayerAccess(user!, {
      ...player,
      team: player.team ?? undefined,
    });
    if (accessRes) return accessRes;

    // Check for duplicate pending invite
    const existing = await prisma.parentInvite.findFirst({
      where: {
        phone: normalized,
        playerId,
        status: "pending",
      },
    });

    if (existing) {
      return NextResponse.json({ success: true });
    }

    await prisma.parentInvite.create({
      data: {
        phone: normalized,
        playerId,
        teamId: player.teamId ?? undefined,
        invitedByUserId: user!.id,
        invitedByCoachId: player.team?.coachId ?? undefined,
        status: "pending",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/coach/invite-parent failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка отправки приглашения",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
