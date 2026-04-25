import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Возвращает ID игрока "Голыш Марк" для демо-паспорта (non-production).
 * Если игрока нет — вернёт null (запустите: node scripts/seed-hockey-passport.js).
 * Production: 410 Gone, без обращения к БД.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "not_available_in_production" },
      { status: 410 }
    );
  }

  try {
    const player = await prisma.player.findFirst({
      where: { firstName: "Марк", lastName: "Голыш" },
      select: { id: true },
    });
    return NextResponse.json({ id: player?.id ?? null });
  } catch (error) {
    console.error("GET /api/player/demo failed:", error);
    return NextResponse.json({ id: null }, { status: 200 });
  }
}
