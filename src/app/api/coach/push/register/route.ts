/**
 * POST /api/coach/push/register
 * Register Expo push token for the CRM user’s team coach (coach mobile app).
 * Auth: Bearer (requireCrmRole). Coach / main coach must have teamId → team.coachId.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";

async function resolveCoachIdForUser(user: {
  role: string;
  teamId?: string | null;
}): Promise<string | null> {
  if ((user.role === "COACH" || user.role === "MAIN_COACH") && user.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: user.teamId },
      select: { coachId: true },
    });
    return team?.coachId ?? null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;
  if (!user) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const coachId = await resolveCoachIdForUser(user);
  if (!coachId) {
    return NextResponse.json(
      {
        error:
          "Для push нужна команда тренера. Войдите под учётной записью тренера с привязанной командой.",
      },
      { status: 403 }
    );
  }

  const coach = await prisma.coach.findUnique({ where: { id: coachId } });
  if (!coach) {
    return NextResponse.json({ error: "Профиль тренера не найден" }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const expoPushToken = body?.expoPushToken;
    const platform = body?.platform ?? "unknown";

    if (!expoPushToken || typeof expoPushToken !== "string") {
      return NextResponse.json(
        { error: "expoPushToken обязателен" },
        { status: 400 }
      );
    }

    const tokenStr = expoPushToken.trim();
    if (!tokenStr.startsWith("ExponentPushToken[") && !tokenStr.startsWith("ExpoPushToken[")) {
      return NextResponse.json(
        { error: "Некорректный Expo push token" },
        { status: 400 }
      );
    }

    const appVersion = body?.appVersion ?? null;

    await prisma.coachPushDevice.upsert({
      where: {
        coachId_expoPushToken: { coachId, expoPushToken: tokenStr },
      },
      create: {
        coachId,
        expoPushToken: tokenStr,
        platform: String(platform),
        appVersion: appVersion ? String(appVersion) : null,
        isActive: true,
        lastUsedAt: new Date(),
      },
      update: {
        platform: String(platform),
        appVersion: appVersion ? String(appVersion) : null,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/coach/push/register failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка регистрации устройства",
        details: error instanceof Error ? error.message : "",
      },
      { status: 500 }
    );
  }
}
