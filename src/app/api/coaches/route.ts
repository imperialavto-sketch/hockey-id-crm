import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "coaches", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const specialization = searchParams.get("specialization")?.trim();
    const teamId = searchParams.get("teamId")?.trim();

    const where: Record<string, unknown> = {
      isMarketplaceIndependent: false,
    };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
      ];
    }
    if (specialization) where.specialization = { contains: specialization, mode: "insensitive" as const };
    if (teamId) where.teams = { some: { id: teamId } };

    const coaches = await prisma.coach.findMany({
      where,
      include: { teams: { include: { _count: { select: { trainings: true, players: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    const withCounts = coaches.map((c) => ({
      ...c,
      trainingsCount: c.teams.reduce((sum, t) => sum + t._count.trainings, 0),
    }));
    return NextResponse.json(withCounts);
  } catch (error) {
    console.error("GET /api/coaches failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки тренеров",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { res } = await requirePermission(req, "coaches", "create");
  if (res) return res;
  try {
    const body = await req.json().catch(() => ({}));
    const { firstName, lastName, phone, email, specialization, teamIds } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "Имя и фамилия обязательны" },
        { status: 400 }
      );
    }

    const coach = await prisma.coach.create({
      data: {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        phone: phone ? String(phone).trim() || null : null,
        email: email ? String(email).trim() || null : null,
        specialization: specialization ? String(specialization).trim() || null : null,
        isMarketplaceIndependent: false,
      },
    });

    const ids = Array.isArray(teamIds) ? teamIds.filter((x: unknown) => typeof x === "string") : [];
    if (ids.length > 0) {
      await prisma.team.updateMany({
        where: { id: { in: ids } },
        data: { coachId: coach.id },
      });
    }

    const created = await prisma.coach.findUnique({
      where: { id: coach.id },
      include: { teams: { include: { school: true } } },
    });
    return NextResponse.json(created ?? coach);
  } catch (error) {
    console.error("POST /api/coaches failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка создания тренера",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
