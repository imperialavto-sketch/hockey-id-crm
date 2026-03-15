import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
