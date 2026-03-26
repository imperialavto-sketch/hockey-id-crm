/**
 * POST /api/marketplace/booking-request — create parent booking request.
 * PUBLIC: no auth required. Form collects parentName, parentPhone.
 * When Bearer token present, parentId is linked from validated session.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  console.log("[API]", {
    path: "/api/marketplace/booking-request",
    method: "POST",
    time: new Date().toISOString(),
  });
  try {
    const parent = (await getAuthFromRequest(req))?.parentId ?? null;

    const body = await req.json().catch(() => ({}));
    const {
      coachId,
      parentName,
      parentPhone,
      playerId,
      message,
      preferredDate,
    } = body;

    if (!coachId || typeof parentName !== "string" || typeof parentPhone !== "string") {
      return apiError(
        "VALIDATION_ERROR",
        "Укажите тренера, имя и телефон",
        400
      );
    }

    const nameTrim = parentName.trim();
    const phoneTrim = parentPhone.trim();
    if (!nameTrim) {
      return apiError("VALIDATION_ERROR", "Введите имя родителя", 400);
    }
    if (!phoneTrim) {
      return apiError("VALIDATION_ERROR", "Введите номер телефона", 400);
    }

    const coachProfile = await prisma.coachProfile.findFirst({
      where: { id: coachId, isPublished: true },
    });
    const independentCoach =
      !coachProfile &&
      (await prisma.coach.findFirst({
        where: {
          id: coachId,
          isMarketplaceIndependent: true,
          displayName: { not: null },
        },
      }));

    const indieOk =
      independentCoach && (independentCoach.displayName ?? "").trim().length > 0;

    if (!coachProfile && !indieOk) {
      return apiError("NOT_FOUND", "Тренер не найден", 404);
    }

    const messageStr = typeof message === "string" ? message.trim() : "";
    const dateParsed = preferredDate ? new Date(preferredDate) : null;
    const playerIdVal = playerId && typeof playerId === "string" ? playerId : null;

    const booking = await prisma.coachBookingRequest.create({
      data: {
        coachId: coachProfile ? coachId : undefined,
        independentCoachId: indieOk ? coachId : undefined,
        parentId: parent ?? undefined,
        parentName: nameTrim,
        parentPhone: phoneTrim,
        playerId: playerIdVal,
        message: messageStr || "—",
        preferredDate: dateParsed && !isNaN(dateParsed.getTime()) ? dateParsed : undefined,
        status: "new",
      },
    });

    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      message: "Заявка отправлена",
    });
  } catch (error) {
    console.error("POST /api/marketplace/booking-request error:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
