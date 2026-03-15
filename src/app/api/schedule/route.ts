import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-rbac";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "trainings", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: { teamId?: string; startTime?: { gte?: Date; lte?: Date } } = {};
    if (teamId) where.teamId = teamId;
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from);
      if (to) where.startTime.lte = new Date(to);
    }

    const trainings = await prisma.training.findMany({
      where,
      include: { team: { include: { coach: true } } },
      orderBy: { startTime: "asc" },
    });
    return NextResponse.json(trainings);
  } catch (error) {
    console.error("GET /api/schedule failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки расписания" },
      { status: 500 }
    );
  }
}
