/**
 * POST /api/parent/push/register
 * Register Expo push token for authenticated parent.
 * Auth: x-parent-id header.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, PARENT_ID_HEADER } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const parentId = req.headers.get(PARENT_ID_HEADER)?.trim();
  if (!parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация (x-parent-id)" },
      { status: 401 }
    );
  }

  try {
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      return NextResponse.json({ error: "Родитель не найден" }, { status: 404 });
    }

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

    await prisma.pushDevice.upsert({
      where: {
        parentId_expoPushToken: { parentId, expoPushToken: tokenStr },
      },
      create: {
        parentId,
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
    console.error("POST /api/parent/push/register failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка регистрации устройства",
        details: error instanceof Error ? error.message : "",
      },
      { status: 500 }
    );
  }
}
