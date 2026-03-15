/**
 * GET /api/marketplace/coaches — list published coaches (public for parents).
 * Supports filters: city, category, format.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city")?.trim() || undefined;
    const category = searchParams.get("category")?.trim() || undefined;
    const format = searchParams.get("format")?.trim() || undefined;

    const where: { isPublished: boolean; city?: string } = { isPublished: true };
    if (city) where.city = city;

    let coaches = await prisma.coachProfile.findMany({
      where,
      include: { services: true },
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    });

    if (category) {
      coaches = coaches.filter((c) => {
        const arr = (c.specialties as string[]) ?? [];
        return arr.includes(category);
      });
    }
    if (format) {
      coaches = coaches.filter((c) => {
        const arr = (c.trainingFormats as string[]) ?? [];
        return arr.includes(format);
      });
    }

    const mapped = coaches.map((c) => {
      const specialties = (c.specialties as string[]) ?? [];
      const formats = (c.trainingFormats as string[]) ?? [];
      return {
        id: c.id,
        fullName: c.fullName,
        slug: c.slug,
        city: c.city,
        bio: c.bio ?? "",
        specialties,
        experienceYears: c.experienceYears,
        priceFrom: c.priceFrom,
        rating: c.rating,
        trainingFormats: formats,
        photoUrl: c.photoUrl,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/marketplace/coaches failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки тренеров",
        details: error instanceof Error ? error.message : "",
      },
      { status: 500 }
    );
  }
}
