import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import {
  coachToMarketplacePublic,
  serializeMarketplaceCoachResponse,
} from "@/lib/independent-coach";

export async function GET(req: NextRequest) {
  console.log("[API]", {
    path: "/api/marketplace/coaches",
    method: "GET",
    time: new Date().toISOString(),
  });
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city")?.trim() || undefined;
    const category = searchParams.get("category")?.trim() || undefined;
    const format = searchParams.get("format")?.trim().toLowerCase() || undefined;

    const where: {
      isMarketplaceIndependent: true;
      city?: string;
    } = { isMarketplaceIndependent: true };
    if (city) where.city = city;

    let coaches = await prisma.coach.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
    });

    coaches = coaches.filter((c) => (c.displayName ?? "").trim().length > 0);

    if (category) {
      coaches = coaches.filter((c) => {
        const arr = coachToMarketplacePublic(c).specialties;
        return arr.some((s) => s.toLowerCase() === category.toLowerCase());
      });
    }
    if (format) {
      coaches = coaches.filter((c) => {
        const arr = coachToMarketplacePublic(c).formats;
        return arr.includes(format);
      });
    }

    const mapped = coaches.map((c) =>
      serializeMarketplaceCoachResponse(coachToMarketplacePublic(c))
    );

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/marketplace/coaches error:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
