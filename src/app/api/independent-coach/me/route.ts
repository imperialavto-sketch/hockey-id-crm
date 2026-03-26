import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  forbiddenResponse,
  getAuthFromRequest,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import {
  coachToMarketplacePublic,
  mergePatchIntoCoachUpdate,
  parsePatchBody,
} from "@/lib/independent-coach";

const COACH_ROLES = ["COACH", "MAIN_COACH"] as const;

async function getIndependentCoachForUser(userId: string) {
  return prisma.coach.findFirst({
    where: {
      linkedUserId: userId,
      isMarketplaceIndependent: true,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthFromRequest(req);
    if (!user) return unauthorizedResponse();
    if (!COACH_ROLES.includes(user.role as (typeof COACH_ROLES)[number])) {
      return forbiddenResponse();
    }

    const coach = await getIndependentCoachForUser(user.id);
    if (!coach) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Профиль не найден" } },
        { status: 404 }
      );
    }

    return NextResponse.json(coachToMarketplacePublic(coach));
  } catch (error) {
    console.error("GET /api/independent-coach/me failed:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthFromRequest(req);
    if (!user) return unauthorizedResponse();
    if (!COACH_ROLES.includes(user.role as (typeof COACH_ROLES)[number])) {
      return forbiddenResponse();
    }

    const coach = await getIndependentCoachForUser(user.id);
    if (!coach) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Профиль не найден" } },
        { status: 404 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return apiError("INVALID_JSON", "Некорректное тело запроса", 400);
    }

    let patch;
    try {
      patch = parsePatchBody(body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка валидации";
      return apiError("VALIDATION_ERROR", msg, 400);
    }

    const data = mergePatchIntoCoachUpdate(patch);
    if (Object.keys(data).length === 0) {
      return apiError("VALIDATION_ERROR", "Нет полей для обновления", 400);
    }

    const updated = await prisma.coach.update({
      where: { id: coach.id },
      data: data as Prisma.CoachUncheckedUpdateInput,
    });

    return NextResponse.json(coachToMarketplacePublic(updated));
  } catch (error) {
    console.error("PATCH /api/independent-coach/me failed:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
