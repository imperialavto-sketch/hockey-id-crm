import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trainings = await prisma.training.findMany({
      where: { team: { coachId: id } },
      include: {
        team: true,
        journal: { where: { coachId: id } },
        _count: { select: { attendances: true } },
      },
      orderBy: { startTime: "desc" },
    });
    return NextResponse.json(trainings);
  } catch (err) {
    console.error("GET /api/coaches/[id]/trainings failed:", err);
    return NextResponse.json({ error: "Ошибка загрузки тренировок" }, { status: 500 });
  }
}
