import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { user, res } = await requirePermission(req, "payments", "view");
  if (res) return res;
  try {
    const paymentPlayerFilter =
      user!.role === "MAIN_COACH" && user!.teamId
        ? { player: { teamId: user!.teamId } }
        : {};
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!, 10)
      : new Date().getFullYear();
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!, 10)
      : new Date().getMonth() + 1;

    const payments = await prisma.playerPayment.findMany({
      where: { year, month, ...paymentPlayerFilter },
      include: { player: { include: { team: true } } },
    });

    const allPayments = await prisma.playerPayment.findMany({
      where: { year, ...paymentPlayerFilter },
      include: { player: { include: { team: true } } },
    });

    const paid = payments.filter((p) => p.status === "Оплачено");
    const unpaid = payments.filter((p) => p.status !== "Оплачено");
    const debtAmount = unpaid.reduce((s, p) => s + p.amount, 0);
    const paidAmount = paid.reduce((s, p) => s + p.amount, 0);

    const byTeam: Record<string, { paid: number; unpaid: number; paidAmount: number; debtAmount: number }> = {};
    for (const p of allPayments) {
      const teamName = p.player.team?.name ?? "Без команды";
      if (!byTeam[teamName]) {
        byTeam[teamName] = { paid: 0, unpaid: 0, paidAmount: 0, debtAmount: 0 };
      }
      if (p.status === "Оплачено") {
        byTeam[teamName].paid++;
        byTeam[teamName].paidAmount += p.amount;
      } else {
        byTeam[teamName].unpaid++;
        byTeam[teamName].debtAmount += p.amount;
      }
    }

    const monthlyData: { month: number; paid: number; unpaid: number; paidAmount: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const pm = allPayments.filter((p) => p.month === m);
      const pPaid = pm.filter((p) => p.status === "Оплачено");
      monthlyData.push({
        month: m,
        paid: pPaid.length,
        unpaid: pm.length - pPaid.length,
        paidAmount: pPaid.reduce((s, p) => s + p.amount, 0),
      });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const upcomingUnpaid = allPayments
      .filter((p) => p.status !== "Оплачено" && (p.year > currentYear || (p.year === currentYear && p.month >= currentMonth)))
      .sort((a, b) => (a.year - b.year) * 12 + (a.month - b.month))
      .slice(0, 10);

    return NextResponse.json({
      currentMonth: {
        totalAmount: paidAmount,
        paidCount: paid.length,
        unpaidCount: unpaid.length,
        debtAmount,
      },
      byTeam,
      monthlyData,
      lastPayments: allPayments
        .filter((p) => p.paidAt)
        .sort((a, b) => (new Date(b.paidAt!).getTime()) - (new Date(a.paidAt!).getTime()))
        .slice(0, 10)
        .map((p) => ({
          id: p.id,
          month: p.month,
          year: p.year,
          amount: p.amount,
          status: p.status,
          paidAt: p.paidAt,
          player: p.player,
        })),
      upcomingUnpaid: upcomingUnpaid.map((p) => ({
        id: p.id,
        month: p.month,
        year: p.year,
        amount: p.amount,
        player: p.player,
      })),
    });
  } catch (err) {
    console.error("GET /api/finance/summary failed:", err);
    return NextResponse.json({ error: "Ошибка загрузки сводки" }, { status: 500 });
  }
}
