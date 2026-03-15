import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";

export async function GET(req: NextRequest) {
  const { user, res } = await requirePermission(req, "players", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const position = searchParams.get("position");
    const status = searchParams.get("status");
    const ageGroup = searchParams.get("ageGroup")?.trim();
    const search = searchParams.get("search")?.trim();

    const where: Record<string, unknown> = {};
    const accessibleIds = await getAccessiblePlayerIds(user!, prisma);
    if (accessibleIds !== null) {
      where.id = { in: accessibleIds };
    }
    if (teamId) where.teamId = teamId;
    if (position) where.position = position;
    if (status) where.status = status;
    if (ageGroup) where.team = { ageGroup };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const includeSkills = searchParams.get("expand") === "full";
    const players = await prisma.player.findMany({
      where,
      include: {
        team: { include: { coach: true } },
        ...(includeSkills && { skills: true, teamHistory: true }),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(players);
  } catch (error) {
    console.error("GET /api/players failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки игроков",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { user, res } = await requirePermission(req, "players", "create");
  if (res) return res;
  try {
    const body = await req.json().catch(() => ({}));
    const {
      firstName,
      lastName,
      birthYear,
      birthDate,
      position,
      grip,
      height,
      weight,
      city,
      country,
      teamId,
      status,
      comment,
    } = body;

    if (!firstName || !lastName || birthYear == null || !position || !grip) {
      return NextResponse.json(
        { error: "Имя, фамилия, год рождения, амплуа и хват обязательны" },
        { status: 400 }
      );
    }

    const year = parseInt(String(birthYear), 10);
    if (isNaN(year) || year < 1990 || year > 2020) {
      return NextResponse.json(
        { error: "Некорректный год рождения" },
        { status: 400 }
      );
    }

    let birthDateVal: Date | null = null;
    if (birthDate) {
      const d = new Date(birthDate);
      if (!isNaN(d.getTime())) birthDateVal = d;
    }

    const requestedTeamId = teamId ? String(teamId).trim() || null : null;
    if (requestedTeamId) {
      const team = await prisma.team.findUnique({
        where: { id: requestedTeamId },
        select: { id: true, schoolId: true },
      });
      if (team) {
        const { canAccessTeam } = await import("@/lib/data-scope");
        if (!canAccessTeam(user!, team)) {
          return NextResponse.json(
            { error: "Нет доступа к указанной команде" },
            { status: 403 }
          );
        }
      }
    }

    const player = await prisma.player.create({
      data: {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        birthYear: year,
        birthDate: birthDateVal,
        position: String(position).trim(),
        grip: String(grip).trim(),
        height: height != null && height !== "" ? Number(height) : null,
        weight: weight != null && weight !== "" ? Number(weight) : null,
        city: city ? String(city).trim() || null : null,
        country: country ? String(country).trim() || null : null,
        teamId: requestedTeamId,
        status: status ? String(status).trim() : "Активен",
        comment: comment ? String(comment).trim() || null : null,
      },
      include: { team: true },
    });

    return NextResponse.json(player);
  } catch (err) {
    console.error("POST /api/players failed:", err);
    return NextResponse.json(
      {
        error: "Ошибка создания игрока",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
