import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const { user, res } = await requirePermission(req, "payments", "edit");
  if (res) return res;
  try {
    const { id, pid } = await params;
    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const body = await req.json().catch(() => ({}));
    const { amount, status, paidAt } = body;

    const payment = await prisma.playerPayment.findFirst({
      where: { id: pid, playerId: id },
    });
    if (!payment) {
      return NextResponse.json({ error: "Платёж не найден" }, { status: 404 });
    }

    const updateData: { amount?: number; status?: string; paidAt?: Date | null } = {};
    if (amount != null) updateData.amount = Number(amount) || 0;
    if (status != null) updateData.status = String(status);
    if (paidAt !== undefined) {
      updateData.paidAt = paidAt != null && paidAt !== "" ? new Date(paidAt) : null;
    } else if (status === "Оплачено") {
      updateData.paidAt = payment.paidAt ?? new Date();
    } else if (status === "Не оплачено") {
      updateData.paidAt = null;
    }

    const updated = await prisma.playerPayment.update({
      where: { id: pid },
      data: updateData,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/player/[id]/payments/[pid] failed:", error);
    return NextResponse.json(
      { error: "Ошибка обновления платежа" },
      { status: 500 }
    );
  }
}
