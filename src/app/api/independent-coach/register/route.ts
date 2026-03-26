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
  buildCoachMarketplaceUpdate,
  coachToMarketplacePublic,
  parseRegisterBody,
  splitDisplayNameForCoach,
} from "@/lib/independent-coach";

const COACH_ROLES = ["COACH", "MAIN_COACH"] as const;

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthFromRequest(req);
    if (!user) return unauthorizedResponse();
    if (!COACH_ROLES.includes(user.role as (typeof COACH_ROLES)[number])) {
      return forbiddenResponse();
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return apiError("INVALID_JSON", "Некорректное тело запроса", 400);
    }

    let input;
    try {
      input = parseRegisterBody(body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка валидации";
      return apiError("VALIDATION_ERROR", msg, 400);
    }

    const existing = await prisma.coach.findUnique({
      where: { linkedUserId: user.id },
    });

    if (existing) {
      if (!existing.isMarketplaceIndependent) {
        return apiError(
          "SCHOOL_COACH_ALREADY_LINKED",
          "Этот аккаунт уже привязан к профилю тренера школы в CRM. Его нельзя автоматически перевести в маркетплейс: в базе одна привязка пользователя к тренеру (linkedUserId). Обратитесь в поддержку или используйте отдельный аккаунт для частной практики.",
          409
        );
      }

      const coach = await prisma.coach.update({
        where: { id: existing.id },
        data: buildCoachMarketplaceUpdate(input) as Prisma.CoachUncheckedUpdateInput,
      });
      return NextResponse.json(coachToMarketplacePublic(coach), { status: 200 });
    }

    const { firstName, lastName } = splitDisplayNameForCoach(input.displayName);
    const coach = await prisma.coach.create({
      data: {
        firstName,
        lastName,
        displayName: input.displayName,
        city: input.city,
        bio: input.bio,
        specialties: input.specialties as unknown as Prisma.InputJsonValue,
        formats: input.formats as unknown as Prisma.InputJsonValue,
        priceFrom: input.priceFrom ?? undefined,
        photoUrl: input.photoUrl ?? undefined,
        isMarketplaceIndependent: true,
        linkedUserId: user.id,
      },
    });

    return NextResponse.json(coachToMarketplacePublic(coach), { status: 201 });
  } catch (error) {
    console.error("POST /api/independent-coach/register failed:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
