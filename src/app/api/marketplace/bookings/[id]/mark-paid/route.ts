import { NextRequest, NextResponse } from "next/server";
import {
  forbiddenResponse,
  getAuthFromRequest,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import {
  markMarketplaceBookingPaid,
  serializeMarketplaceBookingForCoach,
} from "@/lib/marketplace-slot-booking";

/**
 * POST /api/marketplace/bookings/[id]/mark-paid
 * Coach-only: mark a confirmed marketplace booking as paid (MVP / manual or simulated settlement).
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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const paymentMethod =
      typeof body.paymentMethod === "string" ? body.paymentMethod : undefined;
    const paymentReference =
      typeof body.paymentReference === "string" ? body.paymentReference : undefined;

    const allowedRoles = ["COACH", "MAIN_COACH"] as const;
    if (!allowedRoles.includes(user.role as (typeof allowedRoles)[number])) {
      return forbiddenResponse();
    }

    const result = await markMarketplaceBookingPaid({
      bookingId,
      user,
      paymentMethod,
      paymentReference,
    });

    if (!result.ok) {
      if (result.code === "NOT_FOUND") {
        return apiError("NOT_FOUND", "Бронирование не найдено", 404);
      }
      if (result.code === "FORBIDDEN") {
        return forbiddenResponse();
      }
      let msg =
        "Недопустимое изменение статуса оплаты для этой брони";
      if (result.reason === "BOOKING_NOT_CONFIRMED") {
        msg =
          "Оплату можно отметить только после подтверждения брони тренером";
      } else if (result.reason === "PAYMENT_STATUS_NOT_MARKABLE") {
        msg =
          "Текущий статус оплаты не позволяет отметить оплату (уже оплачено, возврат или другой финальный статус)";
      }
      return apiError("INVALID_PAYMENT_TRANSITION", msg, 400);
    }

    return NextResponse.json(serializeMarketplaceBookingForCoach(result.booking));
  } catch (error) {
    console.error("POST /api/marketplace/bookings/[id]/mark-paid failed:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
