import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "dashboard", "view");
  if (res) return res;
  try {
    const now = new Date();

    const trainings = await prisma.training.findMany({
      where: { startTime: { gte: now } },
      include: { team: { include: { coach: true } } },
      orderBy: { startTime: "asc" },
      take: 5,
    });

    return NextResponse.json(trainings);
  } catch (err) {
    console.error("GET /api/dashboard/upcoming-trainings failed:", err);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}
