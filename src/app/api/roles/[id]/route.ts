import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { permissions } = body;

    if (Array.isArray(permissions)) {
      await prisma.permission.deleteMany({ where: { roleId: id } });
      for (const p of permissions) {
        if (p && p.module) {
          await prisma.permission.create({
            data: {
              roleId: id,
              module: String(p.module),
              canView: !!p.canView,
              canCreate: !!p.canCreate,
              canEdit: !!p.canEdit,
              canDelete: !!p.canDelete,
            },
          });
        }
      }
    }

    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });
    return NextResponse.json(role);
  } catch (err) {
    console.error("PUT /api/roles/[id] failed:", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
