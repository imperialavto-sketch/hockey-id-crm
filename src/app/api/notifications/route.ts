import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");
    const unreadOnly = searchParams.get("unread") === "true";

    if (!parentId) {
      return NextResponse.json(
        { error: "parentId обязателен" },
        { status: 400 }
      );
    }

    const where: { parentId: string; read?: boolean } = { parentId };
    if (unreadOnly) where.read = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET /api/notifications failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки уведомлений" },
      { status: 500 }
    );
  }
}
