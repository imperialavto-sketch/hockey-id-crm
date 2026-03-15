/**
 * PATCH /api/admin/marketplace/booking-requests/[id] — update status.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";

const VALID_STATUSES = ["new", "in_progress", "confirmed", "declined"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(req);
  if (!user || !["SCHOOL_ADMIN", "SCHOOL_MANAGER", "MAIN_COACH"].includes(user.role)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(String(status))) {
      return NextResponse.json(
        { error: "Укажите статус: new, in_progress, confirmed, declined" },
        { status: 400 }
      );
    }

    const req_ = await prisma.coachBookingRequest.update({
      where: { id },
      data: { status: String(status) },
    });

    return NextResponse.json({
      id: req_.id,
      status: req_.status,
      updatedAt: req_.updatedAt.toISOString(),
    });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
    }
    console.error("PATCH /api/admin/marketplace/booking-requests/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка обновления", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
