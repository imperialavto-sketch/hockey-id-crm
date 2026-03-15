import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const role = searchParams.get("role")?.trim();

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ];
    }
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      include: { school: true, team: true },
      orderBy: { name: "asc" },
    });

    const safe = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      teamId: u.teamId,
      teamName: u.team?.name,
      status: u.status,
      schoolId: u.schoolId,
    }));
    return NextResponse.json(safe);
  } catch (err) {
    console.error("GET /api/users failed:", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, phone, password, role, teamId, status } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email и пароль обязательны" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
    if (exists) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 400 });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const validRole = ["SCHOOL_ADMIN", "MAIN_COACH", "COACH", "SCHOOL_MANAGER", "PARENT"].includes(String(role))
      ? role
      : "COACH";

    const user = await prisma.user.create({
      data: {
        name: String(name || email).trim(),
        email: String(email).trim().toLowerCase(),
        password: hash,
        phone: phone ? String(phone).trim() || null : null,
        role: validRole,
        teamId: teamId ? String(teamId) : null,
        status: status ? String(status) : "Активен",
      },
      include: { team: true, school: true },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      teamId: user.teamId,
      teamName: user.team?.name,
      status: user.status,
    });
  } catch (err) {
    console.error("POST /api/users failed:", err);
    return NextResponse.json({ error: "Ошибка создания" }, { status: 500 });
  }
}
