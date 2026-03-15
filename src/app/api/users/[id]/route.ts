import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, email, phone, password, role, teamId, status } = body;

    const data: Record<string, unknown> = {};
    if (name != null) data.name = String(name).trim();
    if (email != null) data.email = String(email).trim().toLowerCase();
    if (phone !== undefined) data.phone = phone ? String(phone).trim() || null : null;
    if (role != null && ["SCHOOL_ADMIN", "MAIN_COACH", "COACH", "SCHOOL_MANAGER", "PARENT"].includes(String(role))) {
      data.role = role;
    }
    if (teamId !== undefined) data.teamId = teamId ? String(teamId) : null;
    if (status !== undefined) data.status = String(status);

    if (password && String(password).length >= 6) {
      data.password = await bcrypt.hash(String(password), 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      include: { team: true },
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
    console.error("PUT /api/users/[id] failed:", err);
    return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/users/[id] failed:", err);
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 });
  }
}
