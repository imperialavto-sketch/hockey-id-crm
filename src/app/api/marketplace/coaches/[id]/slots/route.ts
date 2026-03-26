import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getMarketplaceCoachById,
  serializeAvailability,
} from "@/lib/coach-availability";

/**
 * GET /api/marketplace/coaches/[id]/slots — публичные свободные слоты
 * только для независимых тренеров (изолировано от школьного CRM).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const coach = await getMarketplaceCoachById(id);
    if (!coach) {
      return NextResponse.json({
        coachId: id,
        slots: [],
        emptyState: "no_slots" as const,
      });
    }

    const rows = await prisma.coachAvailability.findMany({
      where: { coachId: id, isBooked: false },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({
      coachId: id,
      slots: rows.map(serializeAvailability),
      emptyState: rows.length === 0 ? ("no_slots" as const) : undefined,
    });
  } catch (error) {
    console.error("GET /api/marketplace/coaches/[id]/slots failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки слотов" },
      { status: 500 }
    );
  }
}
