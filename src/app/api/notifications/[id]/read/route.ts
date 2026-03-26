/**
 * POST /api/notifications/[id]/read — mark notification as read.
 * Auth: Bearer required. Only the parent who owns the notification can mark it read.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(req);

  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    const existing = await prisma.notification.findUnique({
      where: { id },
      select: { parentId: true },
    });

    if (!existing || existing.parentId !== user.parentId) {
      return NextResponse.json({ error: "Уведомление не найдено" }, { status: 404 });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/notifications/[id]/read failed:", error);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
