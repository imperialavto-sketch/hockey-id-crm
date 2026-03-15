import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let s = await prisma.systemSetting.findFirst();
    if (!s) {
      s = await prisma.systemSetting.create({
        data: {
          theme: "dark",
          language: "ru",
          timezone: "Europe/Moscow",
          dateFormat: "DD.MM.YYYY",
          currency: "RUB",
        },
      });
    }
    return NextResponse.json(s);
  } catch (err) {
    console.error("GET /api/settings/system failed:", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { theme, language, timezone, dateFormat, currency } = body;

    let s = await prisma.systemSetting.findFirst();
    if (!s) {
      s = await prisma.systemSetting.create({
        data: {
          theme: theme || "dark",
          language: language || "ru",
          timezone: timezone || "Europe/Moscow",
          dateFormat: dateFormat || "DD.MM.YYYY",
          currency: currency || "RUB",
        },
      });
    } else {
      s = await prisma.systemSetting.update({
        where: { id: s.id },
        data: {
          ...(theme != null && { theme: String(theme) }),
          ...(language != null && { language: String(language) }),
          ...(timezone != null && { timezone: String(timezone) }),
          ...(dateFormat != null && { dateFormat: String(dateFormat) }),
          ...(currency != null && { currency: String(currency) }),
        },
      });
    }
    return NextResponse.json(s);
  } catch (err) {
    console.error("PUT /api/settings/system failed:", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
