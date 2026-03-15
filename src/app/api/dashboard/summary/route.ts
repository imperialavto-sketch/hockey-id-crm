import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "dashboard", "view");
  if (res) return res;
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const [
      playersCount,
      teamsCount,
      coachesCount,
      trainingsThisMonth,
      payments,
      coachRatings,
    ] = await Promise.all([
      prisma.player.count(),
      prisma.team.count(),
      prisma.coach.count(),
      prisma.training.count({
        where: {
          startTime: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.playerPayment.findMany({
        where: { year, month },
      }),
      prisma.coachRating.findMany({
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    const paid = payments.filter((p) => p.status === "Оплачено");
    const unpaid = payments.filter((p) => p.status !== "Оплачено");
    const paidAmount = paid.reduce((s, p) => s + p.amount, 0);
    const debtAmount = unpaid.reduce((s, p) => s + p.amount, 0);

    const attendances = await prisma.attendance.findMany();
    const totalSlots = attendances.length;
    const presentCount = attendances.filter((a) => a.status === "PRESENT").length;
    const avgAttendance = totalSlots > 0 ? Math.round((presentCount / totalSlots) * 100) : 0;

    const recommendationsCount = coachRatings.filter((r) => r.recommendation).length;

    return NextResponse.json({
      playersCount,
      teamsCount,
      coachesCount,
      trainingsThisMonth,
      avgAttendance,
      paidAmount,
      debtAmount,
      recommendationsCount,
    });
  } catch (err) {
    console.error("GET /api/dashboard/summary failed:", err);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}
