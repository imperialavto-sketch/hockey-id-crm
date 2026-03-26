import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  forbiddenResponse,
  getAuthFromRequest,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import {
  marketplaceParentBookerId,
  serializeMarketplaceBooking,
} from "@/lib/marketplace-slot-booking";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthFromRequest(req);
    if (!user) return unauthorizedResponse();
    if (user.role !== "PARENT") return forbiddenResponse();

    const rows = await prisma.marketplaceSlotBooking.findMany({
      where: { bookerUserId: marketplaceParentBookerId(user) },
      include: { slot: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(rows.map(serializeMarketplaceBooking));
  } catch (error) {
    console.error("GET /api/marketplace/bookings/me failed:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
