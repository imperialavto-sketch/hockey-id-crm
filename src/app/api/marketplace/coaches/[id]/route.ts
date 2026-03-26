import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import {
  coachToMarketplacePublic,
  serializeMarketplaceCoachResponse,
} from "@/lib/independent-coach";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const coach = await prisma.coach.findFirst({
      where: { id, isMarketplaceIndependent: true },
    });

    if (!coach || !(coach.displayName ?? "").trim()) {
      return NextResponse.json(
        { error: "Тренер не найден" },
        { status: 404 }
      );
    }

    const pub = coachToMarketplacePublic(coach);
    return NextResponse.json({
      ...serializeMarketplaceCoachResponse(pub),
      services: [],
    });
  } catch (error) {
    console.error("GET /api/marketplace/coaches/[id] failed:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
