import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const coach = await prisma.coach.findUnique({
      where: { id },
      include: { teams: { include: { school: true, _count: { select: { players: true, trainings: true } } } } },
    });

    if (!coach) {
      return NextResponse.json(
        { error: "Тренер не найден" },
        { status: 404 }
      );
    }

    if (coach.isMarketplaceIndependent) {
      return NextResponse.json(
        { error: "Тренер не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json(coach);
  } catch (error) {
    console.error("GET /api/coaches/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки тренера",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.coach.findUnique({
      where: { id },
      select: { isMarketplaceIndependent: true },
    });
    if (existing?.isMarketplaceIndependent) {
      return NextResponse.json(
        { error: "Нельзя изменять профиль независимого тренера через CRM школы" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { firstName, lastName, phone, email, specialization, teamIds } = body;

    const data: Record<string, unknown> = {
      ...(firstName != null && { firstName: String(firstName).trim() }),
      ...(lastName != null && { lastName: String(lastName).trim() }),
      ...(phone !== undefined && { phone: phone ? String(phone).trim() || null : null }),
      ...(email !== undefined && { email: email ? String(email).trim() || null : null }),
      ...(specialization !== undefined && { specialization: specialization ? String(specialization).trim() || null : null }),
    };
    const coach = await prisma.coach.update({
      where: { id },
      data,
    });

    if (teamIds !== undefined) {
      await prisma.team.updateMany({ where: { coachId: id }, data: { coachId: null } });
      const ids = Array.isArray(teamIds) ? teamIds.filter((x: unknown) => typeof x === "string") : [];
      if (ids.length > 0) {
        await prisma.team.updateMany({
          where: { id: { in: ids } },
          data: { coachId: id },
        });
      }
    }

    const updated = await prisma.coach.findUnique({
      where: { id },
      include: { teams: { include: { school: true, _count: { select: { players: true, trainings: true } } } } },
    });
    return NextResponse.json(updated ?? coach);
  } catch (error) {
    console.error("PUT /api/coaches/[id] failed:", error);
    return NextResponse.json({ error: "Ошибка обновления тренера" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.coach.findUnique({
      where: { id },
      select: { isMarketplaceIndependent: true },
    });
    if (existing?.isMarketplaceIndependent) {
      return NextResponse.json(
        { error: "Нельзя удалить независимого тренера через CRM школы" },
        { status: 403 }
      );
    }
    await prisma.coachRating.deleteMany({ where: { coachId: id } });
    await prisma.team.updateMany({ where: { coachId: id }, data: { coachId: null } });
    await prisma.coach.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/coaches/[id] failed:", error);
    return NextResponse.json({ error: "Ошибка удаления тренера" }, { status: 500 });
  }
}
