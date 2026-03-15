import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "payments", "view");
  if (res) return res;
  try {
    const { id } = await params;
    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) return NextResponse.json([]);
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const payments = await prisma.playerPayment.findMany({
      where: { playerId: id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error("GET /api/player/[id]/payments failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки платежей" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "payments", "create");
  if (res) return res;
  try {
    const { id } = await params;
    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;
    const body = await req.json().catch(() => ({}));
    const { month, year, amount, status, paidAt } = body;

    if (!month || !year) {
      return NextResponse.json(
        { error: "Месяц и год обязательны" },
        { status: 400 }
      );
    }

    const m = Number(month);
    const y = Number(year);
    const amt = Number(amount) || 0;
    const st = status || "Не оплачено";
    const existing = await prisma.playerPayment.findFirst({
      where: { playerId: id, month: m, year: y },
    });
    const paidAtDate =
      paidAt != null && paidAt !== ""
        ? new Date(paidAt)
        : st === "Оплачено"
          ? new Date()
          : null;
    const payment = existing
      ? await prisma.playerPayment.update({
          where: { id: existing.id },
          data: {
            amount: amt,
            status: st,
            paidAt: st === "Оплачено" ? (paidAtDate ?? new Date()) : st === "Не оплачено" ? null : existing.paidAt,
          },
        })
      : await prisma.playerPayment.create({
          data: {
            playerId: id,
            month: m,
            year: y,
            amount: amt,
            status: st,
            paidAt: paidAtDate,
          },
        });
    return NextResponse.json(payment);
  } catch (error) {
    console.error("POST /api/player/[id]/payments failed:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения платежа" },
      { status: 500 }
    );
  }
}
