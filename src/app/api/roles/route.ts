import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      include: { permissions: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(roles);
  } catch (err) {
    console.error("GET /api/roles failed:", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
