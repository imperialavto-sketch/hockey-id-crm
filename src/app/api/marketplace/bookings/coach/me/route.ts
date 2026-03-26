import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  forbiddenResponse,
  getAuthFromRequest,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { serializeMarketplaceBookingForCoach } from "@/lib/marketplace-slot-booking";

const COACH_ROLES = ["COACH", "MAIN_COACH"] as const;

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthFromRequest(req);
    if (!user) return unauthorizedResponse();
    if (!COACH_ROLES.includes(user.role as (typeof COACH_ROLES)[number])) {
      return forbiddenResponse();
    }

    const coach = await prisma.coach.findFirst({
      where: {
        linkedUserId: user.id,
        isMarketplaceIndependent: true,
      },
      select: { id: true },
    });

    if (!coach) {
      return NextResponse.json(
        {
          error: {
            code: "NO_MARKETPLACE_PROFILE",
            message:
              "Нет профиля частного тренера в маркетплейсе. Оформите регистрацию в разделе независимого тренера.",
          },
        },
        { status: 404 }
      );
    }

    const rows = await prisma.marketplaceSlotBooking.findMany({
      where: { coachId: coach.id },
      include: { slot: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(rows.map(serializeMarketplaceBookingForCoach));
  } catch (error) {
    console.error("GET /api/marketplace/bookings/coach/me failed:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
