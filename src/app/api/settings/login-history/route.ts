import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    const history = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("GET /api/settings/login-history failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки истории" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, ipAddress, userAgent } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    await prisma.loginHistory.create({
      data: { userId, ipAddress: ipAddress ?? null, userAgent: userAgent ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/settings/login-history failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
