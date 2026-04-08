import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

function normalizeInviteCode(value: unknown): string {
  return String(value ?? "").trim();
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, ok: false, code, error: message, message },
    { status }
  );
}

function jsonSuccess(
  body: { code: "LINKED" | "ALREADY_LINKED"; message: string; alreadyLinked?: boolean }
) {
  return NextResponse.json({
    success: true,
    ok: true,
    code: body.code,
    message: body.message,
    ...(body.alreadyLinked ? { alreadyLinked: true } : {}),
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return jsonError(401, "UNAUTHORIZED", "Необходима авторизация");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Неверный формат запроса");
  }

  const inviteCode = normalizeInviteCode(
    body && typeof body === "object" ? (body as Record<string, unknown>).inviteCode : ""
  );
  if (!inviteCode) {
    return jsonError(400, "MISSING_INVITE_CODE", "Введите код приглашения");
  }

  try {
    const parent = await prisma.parent.findUnique({
      where: { id: user.parentId },
      select: { id: true, phone: true },
    });
    if (!parent) {
      return jsonError(404, "PARENT_NOT_FOUND", "Профиль родителя не найден");
    }

    const invite = await prisma.parentInvite.findUnique({
      where: { id: inviteCode },
      include: {
        player: { select: { id: true } },
      },
    });
    if (!invite || !invite.player) {
      return jsonError(404, "INVALID_INVITE", "Код приглашения не найден");
    }

    const alreadyLinked = await prisma.parentPlayer.findUnique({
      where: {
        parentId_playerId: {
          parentId: parent.id,
          playerId: invite.playerId,
        },
      },
      select: { id: true },
    });

    if (alreadyLinked) {
      if (invite.status === "pending") {
        await prisma.parentInvite.update({
          where: { id: invite.id },
          data: { status: "accepted", acceptedAt: invite.acceptedAt ?? new Date() },
        });
      }
      return jsonSuccess({
        code: "ALREADY_LINKED",
        message: "Ребёнок уже подключён к вашему аккаунту",
        alreadyLinked: true,
      });
    }

    if (invite.status === "accepted") {
      return jsonError(409, "INVITE_ALREADY_USED", "Код уже использован");
    }

    if (parent.phone && invite.phone && parent.phone !== invite.phone) {
      return jsonError(
        403,
        "PHONE_MISMATCH",
        "Код приглашения не подходит для этого номера"
      );
    }

    await prisma.$transaction([
      prisma.parentPlayer.create({
        data: {
          parentId: parent.id,
          playerId: invite.playerId,
          relation: "parent",
        },
      }),
      prisma.parentInvite.update({
        where: { id: invite.id },
        data: { status: "accepted", acceptedAt: new Date() },
      }),
    ]);

    return jsonSuccess({
      code: "LINKED",
      message: "Игрок успешно подключён",
    });
  } catch (error) {
    console.error("POST /api/parent/link-by-invite failed:", error);
    return jsonError(500, "SERVER_ERROR", "Не удалось привязать игрока");
  }
}
