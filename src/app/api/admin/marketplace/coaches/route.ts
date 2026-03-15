/**
 * GET /api/admin/marketplace/coaches — list all coaches (admin).
 * POST /api/admin/marketplace/coaches — create coach.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-яё-]/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "coach";
}

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (!user || !["SCHOOL_ADMIN", "SCHOOL_MANAGER", "MAIN_COACH"].includes(user.role)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const coaches = await prisma.coachProfile.findMany({
      include: { services: true },
      orderBy: { createdAt: "desc" },
    });

    const mapped = coaches.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      slug: c.slug,
      city: c.city,
      bio: c.bio,
      specialties: (c.specialties as string[]) ?? [],
      experienceYears: c.experienceYears,
      priceFrom: c.priceFrom,
      rating: c.rating,
      trainingFormats: (c.trainingFormats as string[]) ?? [],
      photoUrl: c.photoUrl,
      isPublished: c.isPublished,
      servicesCount: c.services.length,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/admin/marketplace/coaches failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (!user || !["SCHOOL_ADMIN", "SCHOOL_MANAGER", "MAIN_COACH"].includes(user.role)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
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

    if (!fullName || !city) {
      return NextResponse.json(
        { error: "Укажите имя и город" },
        { status: 400 }
      );
    }

    const baseSlug = slugify(fullName);
    let slug = baseSlug;
    let counter = 0;
    while (await prisma.coachProfile.findUnique({ where: { slug } })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const coach = await prisma.coachProfile.create({
      data: {
        fullName: String(fullName).trim(),
        slug,
        city: String(city).trim(),
        bio: bio ? String(bio).trim() : null,
        specialties: Array.isArray(specialties) ? specialties : [],
        experienceYears: Number(experienceYears) || 0,
        priceFrom: Number(priceFrom) || 0,
        rating: rating != null ? Number(rating) : null,
        trainingFormats: Array.isArray(trainingFormats) ? trainingFormats : [],
        photoUrl: photoUrl ? String(photoUrl).trim() : null,
        isPublished: Boolean(isPublished),
      },
    });

    return NextResponse.json({
      id: coach.id,
      fullName: coach.fullName,
      slug: coach.slug,
      city: coach.city,
      isPublished: coach.isPublished,
    });
  } catch (error) {
    console.error("POST /api/admin/marketplace/coaches failed:", error);
    return NextResponse.json(
      { error: "Ошибка создания", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
