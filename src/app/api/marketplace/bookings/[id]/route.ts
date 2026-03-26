import { NextRequest, NextResponse } from "next/server";
import {
  forbiddenResponse,
  getAuthFromRequest,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { marketplaceBookingPatchContainsPaymentKeys } from "@/lib/marketplace-booking-patch";
import {
  patchMarketplaceSlotBooking,
  serializeMarketplaceBookingForCoach,
} from "@/lib/marketplace-slot-booking";

export async function PATCH(
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
    if (marketplaceBookingPatchContainsPaymentKeys(body)) {
      return apiError(
        "VALIDATION_ERROR",
        "Платёжные поля нельзя менять этим запросом — используйте отдельные методы оплаты маркетплейса",
        400
      );
    }
    const statusRaw = typeof body.status === "string" ? body.status.trim() : "";
    if (statusRaw !== "confirmed" && statusRaw !== "cancelled") {
      return apiError(
        "VALIDATION_ERROR",
        "Укажите status: confirmed или cancelled",
        400
      );
    }

    const allowedRoles = ["PARENT", "COACH", "MAIN_COACH"] as const;
    if (!allowedRoles.includes(user.role as (typeof allowedRoles)[number])) {
      return forbiddenResponse();
    }

    const result = await patchMarketplaceSlotBooking({
      bookingId,
      user,
      nextStatus: statusRaw,
    });

    if (!result.ok) {
      if (result.code === "NOT_FOUND") {
        return apiError("NOT_FOUND", "Бронирование не найдено", 404);
      }
      if (result.code === "FORBIDDEN") {
        return forbiddenResponse();
      }
      return apiError(
        "INVALID_TRANSITION",
        "Недопустимое изменение статуса",
        400
      );
    }

    return NextResponse.json(serializeMarketplaceBookingForCoach(result.booking));
  } catch (error) {
    console.error("PATCH /api/marketplace/bookings/[id] failed:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
