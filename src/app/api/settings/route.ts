import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "settings", "view");
  if (res) return res;
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    return NextResponse.json(settings ?? null);
  } catch (error) {
    console.error("GET /api/settings failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки настроек" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { res } = await requirePermission(req, "settings", "edit");
  if (res) return res;
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, ...data } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    const allowed = [
      "name", "email", "avatarUrl",
      "emailNotifications", "pushNotifications", "smsNotifications",
      "theme", "colorScheme",
      "googleCalendarSync", "paymentSystem", "analyticsService",
      "twoFactorEnabled",
    ];

    const update: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in data) update[k] = data[k];
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: true, settings: null });
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...update },
      update,
    });

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("POST /api/settings failed:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения настроек" },
      { status: 500 }
    );
  }
}
