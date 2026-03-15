import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "schools", "view");
  if (res) return res;
  try {
    const schools = await prisma.school.findMany({
      include: { _count: { select: { teams: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(schools);
  } catch (error) {
    console.error("GET /api/schools failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки школ",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { res } = await requirePermission(req, "schools", "create");
  if (res) return res;
  try {
    const body = await req.json().catch(() => ({}));
    const { name, address, phone, email } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Название школы обязательно" },
        { status: 400 }
      );
    }

    const school = await prisma.school.create({
      data: {
        name: String(name).trim(),
        address: address ? String(address).trim() || null : null,
        phone: phone ? String(phone).trim() || null : null,
        email: email ? String(email).trim() || null : null,
      },
    });
    return NextResponse.json(school);
  } catch (error) {
    console.error("POST /api/schools failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка создания школы",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
