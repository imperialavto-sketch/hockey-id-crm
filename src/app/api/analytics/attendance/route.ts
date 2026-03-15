import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "analytics", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : new Date().getFullYear();

    const playerWhere = teamId ? { teamId } : {};
    const players = await prisma.player.findMany({
      where: playerWhere,
      include: {
        team: true,
        attendances: { include: { training: true } },
      },
    });

    const byTeam: Record<string, { present: number; total: number }> = {};
    const byMonth: Record<number, { present: number; total: number }> = {};
    for (let m = 1; m <= 12; m++) byMonth[m] = { present: 0, total: 0 };

    const playerStats: { playerId: string; playerName: string; teamName: string; present: number; absent: number; total: number; rate: number }[] = [];

    players.forEach((p) => {
      const atts = p.attendances ?? [];
      const teamName = p.team?.name ?? "Без команды";
      if (!byTeam[teamName]) byTeam[teamName] = { present: 0, total: 0 };
      byTeam[teamName].total += atts.length;
      byTeam[teamName].present += atts.filter((a) => a.status === "PRESENT").length;

      atts.forEach((a) => {
        const d = new Date(a.training?.startTime ?? 0);
        if (d.getFullYear() === year && d.getMonth() + 1 >= 1 && d.getMonth() + 1 <= 12) {
          const m = d.getMonth() + 1;
          byMonth[m].total += 1;
          if (a.status === "PRESENT") byMonth[m].present += 1;
        }
      });

      const present = atts.filter((a) => a.status === "PRESENT").length;
      const absent = atts.filter((a) => a.status === "ABSENT").length;
      playerStats.push({
        playerId: p.id,
        playerName: `${p.firstName} ${p.lastName}`,
        teamName,
        present,
        absent,
        total: atts.length,
        rate: atts.length > 0 ? Math.round((present / atts.length) * 100) : 0,
      });
    });

    const topByAttendance = [...playerStats].filter((p) => p.total > 0).sort((a, b) => b.rate - a.rate).slice(0, 10);
    const topAbsences = [...playerStats].filter((p) => p.absent > 0).sort((a, b) => b.absent - a.absent).slice(0, 10);

    return NextResponse.json({
      byTeam: Object.entries(byTeam).map(([name, v]) => ({
        name,
        rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
        present: v.present,
        total: v.total,
      })),
      byMonth: Object.entries(byMonth).map(([m, v]) => ({
        month: parseInt(m, 10),
        rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
        present: v.present,
        total: v.total,
      })),
      topByAttendance,
      topAbsences,
    });
  } catch (err) {
    console.error("GET /api/analytics/attendance failed:", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
