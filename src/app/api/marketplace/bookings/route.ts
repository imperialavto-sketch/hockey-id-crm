import { NextRequest, NextResponse } from "next/server";
import {
  forbiddenResponse,
  getAuthFromRequest,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import {
  createMarketplaceSlotBooking,
  marketplaceParentBookerId,
  serializeMarketplaceBooking,
} from "@/lib/marketplace-slot-booking";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthFromRequest(req);
    if (!user) return unauthorizedResponse();
    if (user.role !== "PARENT") return forbiddenResponse();

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";
    const coachId =
      typeof body.coachId === "string" && body.coachId.trim()
        ? body.coachId.trim()
        : undefined;
    const parentName =
      typeof body.parentName === "string" ? body.parentName.trim() : "";
    const parentPhone =
      typeof body.parentPhone === "string" ? body.parentPhone.trim() : "";
    const playerId =
      typeof body.playerId === "string" && body.playerId.trim()
        ? body.playerId.trim()
        : null;
    const message =
      typeof body.message === "string" ? body.message.trim() : null;

    if (!slotId) {
      return apiError("VALIDATION_ERROR", "Укажите slotId", 400);
    }
    if (!parentName || !parentPhone) {
      return apiError(
        "VALIDATION_ERROR",
        "Укажите имя и телефон родителя",
        400
      );
    }

    const result = await createMarketplaceSlotBooking({
      slotId,
      coachId,
      bookerUserId: marketplaceParentBookerId(user),
      parentName,
      parentPhone,
      playerId,
      message,
    });

    if (!result.ok) {
      if (result.code === "SLOT_TAKEN") {
        return apiError(
          "SLOT_ALREADY_BOOKED",
          "Слот уже занят или недоступен для бронирования",
          409
        );
      }
      if (result.code === "COACH_MISMATCH") {
        return apiError(
          "VALIDATION_ERROR",
          "coachId не совпадает со слотом",
          400
        );
      }
      return apiError(
        "NOT_FOUND",
        "Слот не найден или недоступен для маркетплейса",
        404
      );
    }

    return NextResponse.json(serializeMarketplaceBooking(result.booking), {
      status: 201,
    });
  } catch (error) {
    console.error("POST /api/marketplace/bookings failed:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
