/**
 * GET /api/admin/marketplace/coaches/[id] — coach detail (admin).
 * PATCH /api/admin/marketplace/coaches/[id] — update coach.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(req);
  if (!user || !["SCHOOL_ADMIN", "SCHOOL_MANAGER", "MAIN_COACH"].includes(user.role)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const coach = await prisma.coachProfile.findUnique({
    where: { id },
    include: { services: true },
  });

  if (!coach) {
    return NextResponse.json({ error: "Тренер не найден" }, { status: 404 });
  }

  return NextResponse.json({
    id: coach.id,
    fullName: coach.fullName,
    slug: coach.slug,
    city: coach.city,
    bio: coach.bio,
    specialties: (coach.specialties as string[]) ?? [],
    experienceYears: coach.experienceYears,
    priceFrom: coach.priceFrom,
    rating: coach.rating,
    trainingFormats: (coach.trainingFormats as string[]) ?? [],
    photoUrl: coach.photoUrl,
    isPublished: coach.isPublished,
    services: coach.services.map((s) => ({
      id: s.id,
      coachId: s.coachId,
      title: s.title,
      category: s.category,
      description: s.description,
      durationMinutes: s.durationMinutes,
      price: s.price,
      format: s.format,
    })),
    createdAt: coach.createdAt.toISOString(),
    updatedAt: coach.updatedAt.toISOString(),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(req);
  if (!user || !["SCHOOL_ADMIN", "SCHOOL_MANAGER", "MAIN_COACH"].includes(user.role)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const coach = await prisma.coachProfile.findUnique({ where: { id } });
  if (!coach) {
    return NextResponse.json({ error: "Тренер не найден" }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      fullName,
      city,
      bio,
      specialties,
      experienceYears,
      priceFrom,
      rating,
      trainingFormats,
      photoUrl,
      isPublished,
    } = body;

    const data: Record<string, unknown> = {};
    if (typeof fullName === "string") data.fullName = fullName.trim();
    if (typeof city === "string") data.city = city.trim();
    if (bio !== undefined) data.bio = bio ? String(bio).trim() : null;
    if (Array.isArray(specialties)) data.specialties = specialties;
    if (typeof experienceYears === "number") data.experienceYears = experienceYears;
    if (typeof priceFrom === "number") data.priceFrom = priceFrom;
    if (rating !== undefined) data.rating = rating != null ? Number(rating) : null;
    if (Array.isArray(trainingFormats)) data.trainingFormats = trainingFormats;
    if (photoUrl !== undefined) data.photoUrl = photoUrl ? String(photoUrl).trim() : null;
    if (typeof isPublished === "boolean") data.isPublished = isPublished;

    const updated = await prisma.coachProfile.update({
      where: { id },
      data: data as Parameters<typeof prisma.coachProfile.update>[0]["data"],
    });

    return NextResponse.json({
      id: updated.id,
      fullName: updated.fullName,
      isPublished: updated.isPublished,
    });
  } catch (error) {
    console.error("PATCH /api/admin/marketplace/coaches/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка обновления", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
