import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function POST(req: NextRequest) {
  const { res } = await requirePermission(req, "payments", "create");
  if (res) return res;
  try {
    const body = await req.json().catch(() => ({}));
    const { teamId, month, year, amount } = body;

    if (!teamId || !month || !year) {
      return NextResponse.json(
        { error: "Команда, месяц и год обязательны" },
        { status: 400 }
      );
    }

    const m = parseInt(String(month), 10);
    const y = parseInt(String(year), 10);
    const amt = parseInt(String(amount || 5000), 10) || 5000;
    if (m < 1 || m > 12 || y < 2020 || y > 2030) {
      return NextResponse.json({ error: "Некорректный месяц или год" }, { status: 400 });
    }

    const players = await prisma.player.findMany({
      where: { teamId: String(teamId) },
    });

    const created: { id: string }[] = [];
    for (const player of players) {
      const exists = await prisma.playerPayment.findFirst({
        where: { playerId: player.id, month: m, year: y },
      });
      if (exists) continue;

      const payment = await prisma.playerPayment.create({
        data: {
          playerId: player.id,
          month: m,
          year: y,
          amount: amt,
          status: "Не оплачено",
        },
      });
      created.push({ id: payment.id });
    }

    return NextResponse.json({
      ok: true,
      created: created.length,
      total: players.length,
      payments: created,
    });
  } catch (err) {
    console.error("POST /api/payments/bulk-create failed:", err);
    return NextResponse.json({ error: "Ошибка массового начисления" }, { status: 500 });
  }
}
