import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { user, res } = await requirePermission(req, "payments", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    const basePlayerFilter =
      user!.role === "MAIN_COACH" && user!.teamId ? { teamId: user!.teamId } : {};
    const where: { player?: object } = teamId
      ? { player: { teamId, ...basePlayerFilter } }
      : Object.keys(basePlayerFilter).length
        ? { player: basePlayerFilter }
        : {};

    const unpaid = await prisma.playerPayment.findMany({
      where: { ...where, status: { not: "Оплачено" } },
      include: { player: { include: { team: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const byPlayer: Record<
      string,
      { player: { id: string; firstName: string; lastName: string; team: { name: string } | null }; months: number; totalDebt: number }
    > = {};

    for (const p of unpaid) {
      const key = p.playerId;
      if (!byPlayer[key]) {
        byPlayer[key] = {
          player: p.player,
          months: 0,
          totalDebt: 0,
        };
      }
      byPlayer[key].months++;
      byPlayer[key].totalDebt += p.amount;
    }

    const debtors = Object.values(byPlayer)
      .map((d) => ({
        playerId: d.player.id,
        playerName: `${d.player.firstName} ${d.player.lastName}`,
        team: d.player.team?.name ?? "Без команды",
        monthsUnpaid: d.months,
        totalDebt: d.totalDebt,
      }))
      .sort((a, b) => b.totalDebt - a.totalDebt);

    return NextResponse.json(debtors);
  } catch (err) {
    console.error("GET /api/finance/debtors failed:", err);
    return NextResponse.json({ error: "Ошибка загрузки должников" }, { status: 500 });
  }
}
