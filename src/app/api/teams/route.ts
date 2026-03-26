import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

/** GET /api/teams
 * Success: returns Team[] (array)
 * Error: returns { error: string, details: string } with status 500
 */
export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "teams", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    const ageGroup = searchParams.get("ageGroup");
    const search = searchParams.get("search")?.trim();

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (ageGroup) where.ageGroup = ageGroup;
    if (search) {
      where.name = { contains: search, mode: "insensitive" as const };
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        school: true,
        coach: true,
        _count: { select: { players: true, trainings: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(teams);
  } catch (error) {
    console.error("GET /api/teams failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки команд",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { res } = await requirePermission(req, "teams", "create");
  if (res) return res;
  try {
    const body = await req.json().catch(() => ({}));
    const { name, ageGroup, schoolId } = body;

    if (!name || !ageGroup || !schoolId) {
      return NextResponse.json(
        { error: "Название, возрастная группа и школа обязательны" },
        { status: 400 }
      );
    }

    const rawCoachId = body.coachId ? String(body.coachId).trim() || null : null;
    if (rawCoachId) {
      const coachCheck = await prisma.coach.findUnique({
        where: { id: rawCoachId },
        select: { isMarketplaceIndependent: true },
      });
      if (coachCheck?.isMarketplaceIndependent) {
        return NextResponse.json(
          {
            error:
              "Нельзя назначить независимого тренера маркетплейса на команду школы",
          },
          { status: 400 }
        );
      }
    }

    const team = await prisma.team.create({
      data: {
        name: String(name).trim(),
        ageGroup: String(ageGroup).trim(),
        schoolId: String(schoolId).trim(),
        coachId: rawCoachId,
      },
      include: { school: true, coach: true },
    });
    return NextResponse.json(team);
  } catch (err) {
    console.error("POST /api/teams failed:", err);
    return NextResponse.json({ error: "Ошибка создания команды" }, { status: 500 });
  }
}
