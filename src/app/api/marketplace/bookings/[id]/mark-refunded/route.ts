import { NextRequest, NextResponse } from "next/server";
import {
  forbiddenResponse,
  getAuthFromRequest,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import {
  markMarketplaceBookingRefunded,
  serializeMarketplaceBookingForCoach,
} from "@/lib/marketplace-slot-booking";

/**
 * POST /api/marketplace/bookings/[id]/mark-refunded
 * Coach-only: mark a paid marketplace booking as refunded.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthFromRequest(req);
    if (!user) return unauthorizedResponse();

    const { id: bookingId } = await params;
    if (!bookingId?.trim()) {
      return apiError("VALIDATION_ERROR", "Некорректный id", 400);
    }

    const allowedRoles = ["COACH", "MAIN_COACH"] as const;
    if (!allowedRoles.includes(user.role as (typeof allowedRoles)[number])) {
      return forbiddenResponse();
    }

    const result = await markMarketplaceBookingRefunded({ bookingId, user });

    if (!result.ok) {
      if (result.code === "NOT_FOUND") {
        return apiError("NOT_FOUND", "Бронирование не найдено", 404);
      }
      if (result.code === "FORBIDDEN") {
        return forbiddenResponse();
      }
      const msg =
        result.reason === "NOT_PAID_FOR_REFUND"
          ? "Возврат можно отметить только для брони в статусе «Оплачено»"
          : "Недопустимое изменение статуса оплаты";
      return apiError("INVALID_PAYMENT_TRANSITION", msg, 400);
    }

    return NextResponse.json(serializeMarketplaceBookingForCoach(result.booking));
  } catch (error) {
    console.error("POST /api/marketplace/bookings/[id]/mark-refunded failed:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
