import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ratings = await prisma.coachRating.findMany({
      where: { coachId: id },
      include: { player: { include: { team: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(ratings);
  } catch (err) {
    console.error("GET /api/coaches/[id]/ratings failed:", err);
    return NextResponse.json({ error: "Ошибка загрузки оценок" }, { status: 500 });
  }
}
