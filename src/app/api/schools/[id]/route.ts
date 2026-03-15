import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        teams: { include: { _count: { select: { players: true } } } },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "Школа не найдена" }, { status: 404 });
    }

    return NextResponse.json(school);
  } catch (error) {
    console.error("GET /api/schools/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки школы",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
