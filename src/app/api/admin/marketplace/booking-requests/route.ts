/**
 * GET /api/admin/marketplace/booking-requests — list booking requests (admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (!user || !["SCHOOL_ADMIN", "SCHOOL_MANAGER", "MAIN_COACH"].includes(user.role)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim() || undefined;

    const where = status ? { status } : {};

    const requests = await prisma.coachBookingRequest.findMany({
      where,
      include: { coach: { select: { fullName: true, city: true } } },
      orderBy: { createdAt: "desc" },
    });

    const mapped = requests.map((r) => ({
      id: r.id,
      coachId: r.coachId,
      coachName: r.coach?.fullName ?? "—",
      coachCity: r.coach?.city ?? "—",
      parentId: r.parentId,
      parentName: r.parentName,
      parentPhone: r.parentPhone,
      playerId: r.playerId,
      message: r.message,
      preferredDate: r.preferredDate?.toISOString() ?? null,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/admin/marketplace/booking-requests failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
