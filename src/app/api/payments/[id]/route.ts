import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { res } = await requirePermission(req, "payments", "view");
  if (res) return res;
  try {
    const { id } = await params;
    const payment = await prisma.playerPayment.findUnique({
      where: { id },
      include: { player: { include: { team: true } } },
    });
    if (!payment) return NextResponse.json({ error: "Платёж не найден" }, { status: 404 });
    return NextResponse.json(payment);
  } catch (err) {
    console.error("GET /api/payments/[id] failed:", err);
    return NextResponse.json({ error: "Ошибка загрузки платежа" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { res } = await requirePermission(req, "payments", "edit");
  if (res) return res;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { amount, status, paidAt, comment } = body;

    const data: Record<string, unknown> = {};
    if (amount != null) data.amount = parseInt(String(amount), 10) || 0;
    if (status != null) data.status = String(status);
    if (paidAt !== undefined) data.paidAt = paidAt ? new Date(paidAt) : null;
    if (comment !== undefined) data.comment = comment ? String(comment).trim() || null : null;

    const payment = await prisma.playerPayment.update({
      where: { id },
      data,
      include: { player: { include: { team: true } } },
    });
    return NextResponse.json(payment);
  } catch (err) {
    console.error("PUT /api/payments/[id] failed:", err);
    return NextResponse.json({ error: "Ошибка обновления платежа" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { res } = await requirePermission(req, "payments", "delete");
  if (res) return res;
  try {
    const { id } = await params;
    await prisma.playerPayment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/payments/[id] failed:", err);
    return NextResponse.json({ error: "Ошибка удаления платежа" }, { status: 500 });
  }
}
