import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Возвращает ID игрока "Голыш Марк" для демо-паспорта.
 * Если игрока нет — вернёт null (запустите: node scripts/seed-hockey-passport.js)
 */
export async function GET() {
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
