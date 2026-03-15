import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "analytics", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : new Date().getFullYear();

    const payments = await prisma.playerPayment.findMany({
      where: { year },
      include: { player: { include: { team: true } } },
    });

    const byMonth: Record<number, { paidAmount: number; paidCount: number; totalCount: number; debtAmount: number }> = {};
    for (let m = 1; m <= 12; m++) byMonth[m] = { paidAmount: 0, paidCount: 0, totalCount: 0, debtAmount: 0 };

    const byTeam: Record<string, { paidAmount: number; debtAmount: number; paidCount: number; totalCount: number }> = {};
    const debtors: { playerId: string; playerName: string; teamName: string; totalDebt: number }[] = [];
    const byPlayerDebt: Record<string, number> = {};

    payments.forEach((p) => {
      const teamName = p.player.team?.name ?? "Без команды";
      byMonth[p.month].totalCount += 1;
      if (p.status === "Оплачено") {
        byMonth[p.month].paidCount += 1;
        byMonth[p.month].paidAmount += p.amount;
      } else {
        byMonth[p.month].debtAmount += p.amount;
      }

      if (!byTeam[teamName]) byTeam[teamName] = { paidAmount: 0, debtAmount: 0, paidCount: 0, totalCount: 0 };
      byTeam[teamName].totalCount += 1;
      if (p.status === "Оплачено") {
        byTeam[teamName].paidAmount += p.amount;
        byTeam[teamName].paidCount += 1;
      } else {
        byTeam[teamName].debtAmount += p.amount;
        const key = p.playerId;
        byPlayerDebt[key] = (byPlayerDebt[key] ?? 0) + p.amount;
      }
    });

    const paidPercent = payments.length > 0
      ? Math.round((payments.filter((p) => p.status === "Оплачено").length / payments.length) * 100)
      : 0;

    Object.entries(byPlayerDebt).forEach(([pid, totalDebt]) => {
      const p = payments.find((x) => x.playerId === pid);
      if (p) {
        debtors.push({
          playerId: pid,
          playerName: `${p.player.firstName} ${p.player.lastName}`,
          teamName: p.player.team?.name ?? "—",
          totalDebt,
        });
      }
    });
    debtors.sort((a, b) => b.totalDebt - a.totalDebt);

    return NextResponse.json({
      byMonth: Object.entries(byMonth).map(([m, v]) => ({
        month: parseInt(m, 10),
        paidAmount: v.paidAmount,
        debtAmount: v.debtAmount,
        paidCount: v.paidCount,
        totalCount: v.totalCount,
        paidPercent: v.totalCount > 0 ? Math.round((v.paidCount / v.totalCount) * 100) : 0,
      })),
      byTeam: Object.entries(byTeam).map(([name, v]) => ({
        name,
        paidAmount: v.paidAmount,
        debtAmount: v.debtAmount,
        paidPercent: v.totalCount > 0 ? Math.round((v.paidCount / v.totalCount) * 100) : 0,
      })),
      paidPercent,
      topDebtors: debtors.slice(0, 10),
    });
  } catch (err) {
    console.error("GET /api/analytics/finance failed:", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
