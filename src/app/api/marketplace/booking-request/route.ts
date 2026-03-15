/**
 * POST /api/marketplace/booking-request — create parent booking request.
 * Auth: x-parent-id header optional (for linking parentId).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
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
      return NextResponse.json(
        { error: "Укажите тренера, имя и телефон" },
        { status: 400 }
      );
    }

    const nameTrim = parentName.trim();
    const phoneTrim = parentPhone.trim();
    if (!nameTrim) {
      return NextResponse.json(
        { error: "Введите имя родителя" },
        { status: 400 }
      );
    }
    if (!phoneTrim) {
      return NextResponse.json(
        { error: "Введите номер телефона" },
        { status: 400 }
      );
    }

    const coach = await prisma.coachProfile.findFirst({
      where: { id: coachId, isPublished: true },
    });

    if (!coach) {
      return NextResponse.json(
        { error: "Тренер не найден" },
        { status: 404 }
      );
    }

    const messageStr = typeof message === "string" ? message.trim() : "";
    const dateParsed = preferredDate ? new Date(preferredDate) : null;
    const playerIdVal = playerId && typeof playerId === "string" ? playerId : null;

    const booking = await prisma.coachBookingRequest.create({
      data: {
        coachId,
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
    console.error("POST /api/marketplace/booking-request failed:", error);
    return NextResponse.json(
      {
        error: "Не удалось отправить заявку",
        details: error instanceof Error ? error.message : "",
      },
      { status: 500 }
    );
  }
}
