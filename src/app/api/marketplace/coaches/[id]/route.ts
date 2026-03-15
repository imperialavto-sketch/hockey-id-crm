/**
 * GET /api/marketplace/coaches/[id] — full coach profile + services.
 * Returns 404 for unpublished coaches.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const coach = await prisma.coachProfile.findFirst({
      where: { id, isPublished: true },
      include: { services: true },
    });

    if (!coach) {
      return NextResponse.json(
        { error: "Тренер не найден" },
        { status: 404 }
      );
    }

    const specialties = (coach.specialties as string[]) ?? [];
    const formats = (coach.trainingFormats as string[]) ?? [];

    const mapped = {
      id: coach.id,
      fullName: coach.fullName,
      slug: coach.slug,
      city: coach.city,
      bio: coach.bio ?? "",
      specialties,
      experienceYears: coach.experienceYears,
      priceFrom: coach.priceFrom,
      rating: coach.rating,
      trainingFormats: formats,
      photoUrl: coach.photoUrl,
      services: coach.services.map((s) => ({
        id: s.id,
        coachId: s.coachId,
        title: s.title,
        category: s.category,
        description: s.description ?? "",
        durationMinutes: s.durationMinutes,
        price: s.price,
        format: s.format,
      })),
    };

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/marketplace/coaches/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки профиля",
        details: error instanceof Error ? error.message : "",
      },
      { status: 500 }
    );
  }
}
