import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import {
  findOverlappingSlot,
  getLinkedIndependentCoachForUser,
  getMarketplaceCoachById,
  isValidAvailabilityType,
  normalizeAvailabilityDate,
  parseTimeToMinutes,
  serializeAvailability,
} from "@/lib/coach-availability";

const COACH_ROLES = ["COACH", "MAIN_COACH"] as const;

export async function GET(req: NextRequest) {
  try {
    const coachId = req.nextUrl.searchParams.get("coachId")?.trim();
    if (!coachId) {
      return NextResponse.json(
        { error: "Параметр coachId обязателен" },
        { status: 400 }
      );
    }

    const coach = await getMarketplaceCoachById(coachId);
    if (!coach) {
      return NextResponse.json([]);
    }

    const rows = await prisma.coachAvailability.findMany({
      where: { coachId },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(rows.map(serializeAvailability));
  } catch (error) {
    console.error("GET /api/availability failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки слотов" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthFromRequest(req);
    if (!user || !COACH_ROLES.includes(user.role as (typeof COACH_ROLES)[number])) {
      return unauthorizedResponse();
    }

    const coach = await getLinkedIndependentCoachForUser(user.id);
    if (!coach) {
      return NextResponse.json(
        {
          error:
            "Слоты доступности доступны только независимым тренерам с привязкой аккаунта",
        },
        { status: 403 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Некорректное тело запроса" },
        { status: 400 }
      );
    }

    const dateRaw = typeof body.date === "string" ? body.date : "";
    const date = normalizeAvailabilityDate(dateRaw);
    if (!date) {
      return NextResponse.json(
        { error: "date: ожидается YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const startTime =
      typeof body.startTime === "string" ? body.startTime.trim() : "";
    const endTime = typeof body.endTime === "string" ? body.endTime.trim() : "";
    const startM = parseTimeToMinutes(startTime);
    const endM = parseTimeToMinutes(endTime);
    if (startM == null || endM == null) {
      return NextResponse.json(
        { error: "startTime и endTime: формат HH:mm (24ч)" },
        { status: 400 }
      );
    }
    if (startM >= endM) {
      return NextResponse.json(
        { error: "startTime должен быть раньше endTime" },
        { status: 400 }
      );
    }

    const typeRaw = typeof body.type === "string" ? body.type.trim() : "";
    if (!isValidAvailabilityType(typeRaw)) {
      return NextResponse.json(
        { error: "type: одно из ice, gym, private" },
        { status: 400 }
      );
    }

    const priceRaw = body.price;
    const price =
      typeof priceRaw === "number" && Number.isInteger(priceRaw) && priceRaw >= 0
        ? priceRaw
        : typeof priceRaw === "string"
          ? parseInt(priceRaw, 10)
          : NaN;
    if (!Number.isInteger(price) || price < 0) {
      return NextResponse.json(
        { error: "price: неотрицательное целое число" },
        { status: 400 }
      );
    }

    const overlap = await findOverlappingSlot(
      coach.id,
      date,
      startM,
      endM
    );
    if (overlap) {
      return NextResponse.json(
        { error: "Слот пересекается с существующим на эту дату" },
        { status: 409 }
      );
    }

    const created = await prisma.coachAvailability.create({
      data: {
        coachId: coach.id,
        date,
        startTime,
        endTime,
        price,
        type: typeRaw,
        isBooked: false,
      },
    });

    return NextResponse.json(serializeAvailability(created), { status: 201 });
  } catch (error) {
    console.error("POST /api/availability failed:", error);
    return NextResponse.json(
      { error: "Ошибка создания слота" },
      { status: 500 }
    );
  }
}
