import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  forbiddenResponse,
  getAuthFromRequest,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  getLinkedIndependentCoachForUser,
  serializeAvailability,
} from "@/lib/coach-availability";

const COACH_ROLES = ["COACH", "MAIN_COACH"] as const;

/**
 * GET /api/availability/me — слоты доступности текущего привязанного независимого тренера.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthFromRequest(req);
    if (!user) return unauthorizedResponse();
    if (!COACH_ROLES.includes(user.role as (typeof COACH_ROLES)[number])) {
      return forbiddenResponse();
    }

    const coach = await getLinkedIndependentCoachForUser(user.id);
    if (!coach) {
      return NextResponse.json(
        {
          error: {
            code: "NO_MARKETPLACE_PROFILE",
            message:
              "Нет профиля частного тренера в маркетплейсе. Оформите регистрацию независимого тренера.",
          },
        },
        { status: 404 }
      );
    }

    const rows = await prisma.coachAvailability.findMany({
      where: { coachId: coach.id },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(rows.map(serializeAvailability));
  } catch (error) {
    console.error("GET /api/availability/me failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки слотов" },
      { status: 500 }
    );
  }
}
