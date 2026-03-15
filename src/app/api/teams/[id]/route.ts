import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { res } = await requirePermission(req, "teams", "view");
  if (res) return res;
  try {
    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        school: true,
        coach: true,
        players: {
          include: { team: true },
        },
        trainings: {
          orderBy: { startTime: "desc" },
          include: {
            attendances: { include: { player: true } },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Команда не найдена" },
        { status: 404 }
      );
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error("GET /api/teams/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки команды",
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
  const { res } = await requirePermission(req, "teams", "edit");
  if (res) return res;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, ageGroup, coachId } = body;

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(ageGroup && { ageGroup: String(ageGroup).trim() }),
        ...(coachId !== undefined && { coachId: coachId ? String(coachId).trim() : null }),
      },
      include: { school: true, coach: true, players: true, trainings: true },
    });
    return NextResponse.json(team);
  } catch (error) {
    console.error("PUT /api/teams/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка обновления команды" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { res } = await requirePermission(req, "teams", "delete");
  if (res) return res;
  try {
    const { id } = await params;
    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/teams/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка удаления команды" },
      { status: 500 }
    );
  }
}
