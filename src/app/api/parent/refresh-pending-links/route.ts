import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { processPendingInvites } from "@/lib/auth/phoneAuthFlow";
import { normalizePhone } from "@/lib/phoneCodeStore";
import { prisma } from "@/lib/prisma";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(_req: NextRequest) {
  const user = await getAuthFromRequest(_req);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      {
        success: false,
        code: "UNAUTHORIZED",
        changed: false,
        linkedPlayersCount: 0,
        message: "Необходима авторизация",
        error: "Необходима авторизация",
      },
      { status: 401, headers: NO_STORE }
    );
  }

  const parentId = user.parentId;

  try {
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { id: true, phone: true },
    });

    if (!parent) {
      return NextResponse.json(
        {
          success: false,
          code: "PARENT_NOT_FOUND",
          changed: false,
          linkedPlayersCount: 0,
          message: "Профиль родителя не найден",
          error: "Профиль родителя не найден",
        },
        { status: 404, headers: NO_STORE }
      );
    }

    const countBefore = await prisma.parentPlayer.count({ where: { parentId } });

    const normalized = normalizePhone(parent.phone ?? "");
    if (!normalized) {
      return NextResponse.json(
        {
          success: true,
          code: "NO_PHONE_ON_PROFILE",
          changed: false,
          linkedPlayersCount: countBefore,
          message:
            "В профиле нет номера телефона. Войдите снова по SMS с тем номером, который указал тренер.",
        },
        { headers: NO_STORE }
      );
    }

    const processedParent = await processPendingInvites(normalized);

    if (processedParent && processedParent.id !== parentId) {
      console.error("[refresh-pending-links] processPendingInvites resolved a different Parent row", {
        sessionParentId: parentId,
        resultParentId: processedParent.id,
      });
    }

    const countAfter = await prisma.parentPlayer.count({ where: { parentId } });
    const changed = countAfter > countBefore;

    if (changed) {
      return NextResponse.json(
        {
          success: true,
          code: "LINKS_APPLIED",
          changed: true,
          linkedPlayersCount: countAfter,
          message: "Приглашения по номеру обработаны.",
        },
        { headers: NO_STORE }
      );
    }

    const code = processedParent === null ? "NO_PENDING_INVITES" : "NO_CHANGE";
    const message =
      code === "NO_PENDING_INVITES"
        ? "Нет ожидающих приглашений на ваш номер."
        : "Связи уже актуальны.";

    return NextResponse.json(
      {
        success: true,
        code,
        changed: false,
        linkedPlayersCount: countAfter,
        message,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("POST /api/parent/refresh-pending-links failed:", error);
    return NextResponse.json(
      {
        success: false,
        code: "SERVER_ERROR",
        changed: false,
        linkedPlayersCount: 0,
        message: "Не удалось обновить привязки",
        error: "Не удалось обновить привязки",
      },
      { status: 500, headers: NO_STORE }
    );
  }
}
