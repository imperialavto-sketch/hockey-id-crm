import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import {
  findOverlappingSlot,
  getLinkedIndependentCoachForUser,
  isValidAvailabilityType,
  normalizeAvailabilityDate,
  parseTimeToMinutes,
  serializeAvailability,
} from "@/lib/coach-availability";

const COACH_ROLES = ["COACH", "MAIN_COACH"] as const;

async function requireSlotOwner(
  req: NextRequest,
  slotId: string
): Promise<
  | { ok: true; coachId: string; slot: Awaited<ReturnType<typeof prisma.coachAvailability.findUnique>> }
  | { ok: false; res: NextResponse }
> {
  const user = await getAuthFromRequest(req);
  if (!user || !COACH_ROLES.includes(user.role as (typeof COACH_ROLES)[number])) {
    return { ok: false, res: unauthorizedResponse() };
  }

  const coach = await getLinkedIndependentCoachForUser(user.id);
  if (!coach) {
    return {
      ok: false,
      res: NextResponse.json(
        {
          error:
            "Слоты доступности доступны только независимым тренерам с привязкой аккаунта",
        },
        { status: 403 }
      ),
    };
  }

  const slot = await prisma.coachAvailability.findUnique({
    where: { id: slotId },
  });

  if (!slot) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Слот не найден" }, { status: 404 }),
    };
  }

  if (slot.coachId !== coach.id) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Нет доступа к этому слоту" }, { status: 403 }),
    };
  }

  return { ok: true, coachId: coach.id, slot };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gate = await requireSlotOwner(req, id);
    if (!gate.ok) return gate.res;

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Некорректное тело запроса" },
        { status: 400 }
      );
    }

    const slot = gate.slot;
    if (!slot) {
      return NextResponse.json({ error: "Слот не найден" }, { status: 404 });
    }

    let date = slot.date;
    if (body.date !== undefined) {
      const d =
        typeof body.date === "string"
          ? normalizeAvailabilityDate(body.date)
          : null;
      if (!d) {
        return NextResponse.json(
          { error: "date: ожидается YYYY-MM-DD" },
          { status: 400 }
        );
      }
      date = d;
    }

    let startTime = slot.startTime;
    let endTime = slot.endTime;
    if (body.startTime !== undefined) {
      if (typeof body.startTime !== "string") {
        return NextResponse.json(
          { error: "startTime: строка HH:mm" },
          { status: 400 }
        );
      }
      startTime = body.startTime.trim();
    }
    if (body.endTime !== undefined) {
      if (typeof body.endTime !== "string") {
        return NextResponse.json(
          { error: "endTime: строка HH:mm" },
          { status: 400 }
        );
      }
      endTime = body.endTime.trim();
    }

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

    let type = slot.type;
    if (body.type !== undefined) {
      const t = typeof body.type === "string" ? body.type.trim() : "";
      if (!isValidAvailabilityType(t)) {
        return NextResponse.json(
          { error: "type: одно из ice, gym, private" },
          { status: 400 }
        );
      }
      type = t;
    }

    let price = slot.price;
    if (body.price !== undefined) {
      const priceRaw = body.price;
      const p =
        typeof priceRaw === "number" && Number.isInteger(priceRaw) && priceRaw >= 0
          ? priceRaw
          : typeof priceRaw === "string"
            ? parseInt(priceRaw, 10)
            : NaN;
      if (!Number.isInteger(p) || p < 0) {
        return NextResponse.json(
          { error: "price: неотрицательное целое число" },
          { status: 400 }
        );
      }
      price = p;
    }

    let isBooked = slot.isBooked;
    if (body.isBooked !== undefined) {
      if (typeof body.isBooked !== "boolean") {
        return NextResponse.json(
          { error: "isBooked: boolean" },
          { status: 400 }
        );
      }
      isBooked = body.isBooked;
    }

    const overlap = await findOverlappingSlot(
      gate.coachId,
      date,
      startM,
      endM,
      id
    );
    if (overlap) {
      return NextResponse.json(
        { error: "Слот пересекается с существующим на эту дату" },
        { status: 409 }
      );
    }

    const updated = await prisma.coachAvailability.update({
      where: { id },
      data: {
        date,
        startTime,
        endTime,
        price,
        type,
        isBooked,
      },
    });

    return NextResponse.json(serializeAvailability(updated));
  } catch (error) {
    console.error("PATCH /api/availability/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка обновления слота" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gate = await requireSlotOwner(req, id);
    if (!gate.ok) return gate.res;

    if (gate.slot?.isBooked) {
      return NextResponse.json(
        {
          error:
            "Нельзя удалить слот с активной бронью. Отмените бронь в маркетплейсе или дождитесь отмены родителем.",
        },
        { status: 409 }
      );
    }

    await prisma.coachAvailability.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/availability/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка удаления слота" },
      { status: 500 }
    );
  }
}
