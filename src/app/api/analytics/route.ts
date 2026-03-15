import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "analytics", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const playerId = searchParams.get("playerId");
    const season = searchParams.get("season");
    const ageGroup = searchParams.get("ageGroup");

    const playerWhere: Record<string, unknown> = {};
    if (playerId) playerWhere.id = playerId;
    else {
      if (teamId) playerWhere.teamId = teamId;
      if (ageGroup) playerWhere.team = { ageGroup };
    }

    const players = await prisma.player.findMany({
      where: playerWhere,
      include: {
        team: true,
        skills: true,
        teamHistory: true,
        stats: { orderBy: { season: "desc" } },
        attendances: { include: { training: true } },
        payments: { where: { year: new Date().getFullYear() } },
      },
    });

    const teams = await prisma.team.findMany({
      where: { ...(teamId ? { id: teamId } : {}), ...(ageGroup ? { ageGroup } : {}) },
      include: {
        players: { include: { skills: true, attendances: true } },
        coach: true,
        trainings: true,
      },
    });

    const coaches = await prisma.coach.findMany({
      include: {
        teams: {
          include: {
            trainings: true,
            players: { include: { skills: true, attendances: true } },
          },
        },
      },
    });

    const seasonMatch = (s: string) =>
      !season || s.includes(season) || s === season;

    // Player stats by season (TeamHistory + PlayerStat)
    const playerStatsBySeason: Record<
      string,
      { season: string; goals: number; assists: number; points: number; pim: number; games: number }[]
    > = {};
    players.forEach((p) => {
      const bySeason: Record<
        string,
        { goals: number; assists: number; points: number; pim: number; games: number }
      > = {};
      (p.teamHistory ?? []).forEach((h) => {
        if (!seasonMatch(h.season)) return;
        const stats = (h.stats as { goals?: number; assists?: number; gamesPlayed?: number; penalties?: number }) ?? {};
        const s = h.season;
        if (!bySeason[s]) bySeason[s] = { goals: 0, assists: 0, points: 0, pim: 0, games: 0 };
        bySeason[s].goals += stats.goals ?? 0;
        bySeason[s].assists += stats.assists ?? 0;
        bySeason[s].games += stats.gamesPlayed ?? 0;
        bySeason[s].pim += stats.penalties ?? 0;
        bySeason[s].points = bySeason[s].goals + bySeason[s].assists;
      });
      (p.stats ?? []).forEach((s) => {
        if (!seasonMatch(s.season)) return;
        const key = s.season;
        if (!bySeason[key]) bySeason[key] = { goals: 0, assists: 0, points: 0, pim: 0, games: 0 };
        bySeason[key].goals += s.goals;
        bySeason[key].assists += s.assists;
        bySeason[key].points += s.points;
        bySeason[key].pim += s.pim;
        bySeason[key].games += s.games;
      });
      const arr = Object.entries(bySeason).map(([season, v]) => ({ season, ...v }));
      if (arr.length) playerStatsBySeason[p.id] = arr;
    });

    // Skills progress - current skills (no history); for "by season" we use teamHistory stats as proxy
    const skillsByPlayer = players
      .filter((p) => p.skills)
      .map((p) => ({
        playerId: p.id,
        playerName: `${p.firstName} ${p.lastName}`,
        speed: p.skills!.speed ?? 0,
        shotAccuracy: p.skills!.shotAccuracy ?? 0,
        dribbling: p.skills!.dribbling ?? 0,
        stamina: p.skills!.stamina ?? 0,
      }));

    // Attendance summary
    const attendanceSummary = players.map((p) => {
      const atts = p.attendances ?? [];
      const present = atts.filter((a) => a.status === "PRESENT").length;
      const total = atts.length;
      return {
        playerId: p.id,
        playerName: `${p.firstName} ${p.lastName}`,
        present,
        absent: atts.filter((a) => a.status === "ABSENT").length,
        late: atts.filter((a) => a.status === "LATE").length,
        total,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });

    // Coach analytics
    const coachAnalytics = coaches.map((c) => {
      const allPlayers = c.teams.flatMap((t) => t.players);
      const withSkills = allPlayers.filter((p) => p.skills);
      const avgSkills = withSkills.length
        ? {
            speed: Math.round(
              withSkills.reduce((s, p) => s + (p.skills!.speed ?? 0), 0) / withSkills.length
            ),
            shotAccuracy: Math.round(
              withSkills.reduce((s, p) => s + (p.skills!.shotAccuracy ?? 0), 0) / withSkills.length
            ),
            dribbling: Math.round(
              withSkills.reduce((s, p) => s + (p.skills!.dribbling ?? 0), 0) / withSkills.length
            ),
            stamina: Math.round(
              withSkills.reduce((s, p) => s + (p.skills!.stamina ?? 0), 0) / withSkills.length
            ),
          }
        : null;
      const totalTrainings = c.teams.reduce((s, t) => s + t.trainings.length, 0);
      const totalAttendance = allPlayers.reduce(
        (s, p) => s + (p.attendances?.filter((a) => a.status === "PRESENT").length ?? 0),
        0
      );
      const totalSlots = allPlayers.reduce(
        (s, p) => s + (p.attendances?.length ?? 0),
        0
      );
      const attendanceRate = totalSlots > 0 ? Math.round((totalAttendance / totalSlots) * 100) : 0;

      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        teamsCount: c.teams.length,
        trainingsCount: totalTrainings,
        playersCount: allPlayers.length,
        avgSkills,
        attendanceRate,
        teamNames: c.teams.map((t) => t.name),
      };
    });

    // Team analytics
    const teamAnalytics = await Promise.all(teams.map(async (t) => {
      const pl = t.players ?? [];
      const withSkills = pl.filter((p) => p.skills);
      const avgSkills = withSkills.length
        ? {
            speed: Math.round(
              withSkills.reduce((s, p) => s + (p.skills!.speed ?? 0), 0) / withSkills.length
            ),
            shotAccuracy: Math.round(
              withSkills.reduce((s, p) => s + (p.skills!.shotAccuracy ?? 0), 0) / withSkills.length
            ),
            dribbling: Math.round(
              withSkills.reduce((s, p) => s + (p.skills!.dribbling ?? 0), 0) / withSkills.length
            ),
            stamina: Math.round(
              withSkills.reduce((s, p) => s + (p.skills!.stamina ?? 0), 0) / withSkills.length
            ),
          }
        : null;
      const totalAtt = pl.reduce(
        (s, p) => s + (p.attendances?.filter((a) => a.status === "PRESENT").length ?? 0),
        0
      );
      const totalSlots = pl.reduce((s, p) => s + (p.attendances?.length ?? 0), 0);
      const attendanceRate = totalSlots > 0 ? Math.round((totalAtt / totalSlots) * 100) : 0;
      const payments = await prisma.playerPayment.findMany({
        where: { playerId: { in: pl.map((p) => p.id) }, year: new Date().getFullYear() },
      });
      const paid = payments.filter((p) => p.status === "Оплачено").length;
      const unpaid = payments.filter((p) => p.status !== "Оплачено").length;
      const totalAmount = payments.reduce((s, p) => s + p.amount, 0);

      return {
        id: t.id,
        name: t.name,
        ageGroup: t.ageGroup,
        coachName: t.coach ? `${t.coach.firstName} ${t.coach.lastName}` : null,
        playersCount: pl.length,
        trainingsCount: t.trainings.length,
        avgSkills,
        attendanceRate,
        paymentSummary: { total: payments.length, paid, unpaid, totalAmount },
        skillsDistribution: withSkills.map((p) => ({
          name: `${p.firstName} ${p.lastName}`,
          speed: p.skills!.speed ?? 0,
          shotAccuracy: p.skills!.shotAccuracy ?? 0,
          dribbling: p.skills!.dribbling ?? 0,
          stamina: p.skills!.stamina ?? 0,
        })),
      };
    }));

    // Aggregated goals/assists/points by season
    const goalsBySeason = players.flatMap((p) =>
      (playerStatsBySeason[p.id] ?? []).map((row) => ({ ...row, playerName: `${p.firstName} ${p.lastName}` }))
    ).reduce((acc: Record<string, number>, row) => {
      acc[row.season] = (acc[row.season] ?? 0) + row.goals;
      return acc;
    }, {});
    const assistsBySeason = players.flatMap((p) =>
      (playerStatsBySeason[p.id] ?? []).map((row) => ({ ...row }))
    ).reduce((acc: Record<string, number>, row) => {
      acc[row.season] = (acc[row.season] ?? 0) + row.assists;
      return acc;
    }, {});

    const skillAvg =
      skillsByPlayer.length > 0
        ? {
            speed: Math.round(
              skillsByPlayer.reduce((s, p) => s + p.speed, 0) / skillsByPlayer.length
            ),
            shotAccuracy: Math.round(
              skillsByPlayer.reduce((s, p) => s + p.shotAccuracy, 0) / skillsByPlayer.length
            ),
            dribbling: Math.round(
              skillsByPlayer.reduce((s, p) => s + p.dribbling, 0) / skillsByPlayer.length
            ),
            stamina: Math.round(
              skillsByPlayer.reduce((s, p) => s + p.stamina, 0) / skillsByPlayer.length
            ),
          }
        : null;

    const paymentSummary = {
      total: 0,
      paid: 0,
      unpaid: 0,
      totalAmount: 0,
    };
    players.forEach((p) => {
      (p.payments ?? []).forEach((pay) => {
        paymentSummary.total += 1;
        paymentSummary.totalAmount += pay.amount;
        if (pay.status === "Оплачено") paymentSummary.paid += 1;
        else paymentSummary.unpaid += 1;
      });
    });

    return NextResponse.json({
      teams: teams.map((t) => ({ id: t.id, name: t.name, ageGroup: t.ageGroup })),
      players: players.map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        teamId: p.teamId,
        teamName: p.team?.name,
      })),
      goalsBySeason: Object.entries(goalsBySeason).map(([season, goals]) => ({ season, goals })),
      assistsBySeason: Object.entries(assistsBySeason).map(([season, assists]) => ({ season, assists })),
      skillAvg,
      coachWorkload: coachAnalytics.map((c) => ({
        name: c.name,
        teams: c.teamsCount,
        trainings: c.trainingsCount,
      })),
      playerStatsBySeason,
      skillsByPlayer,
      attendanceSummary,
      coachAnalytics,
      teamAnalytics: teamId
        ? teamAnalytics.filter((t) => t.id === teamId)
        : teamAnalytics,
      paymentSummary:
        paymentSummary.total > 0
          ? {
              ...paymentSummary,
              paidAmount: 0,
            }
          : undefined,
    });
  } catch (error) {
    console.error("GET /api/analytics failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки аналитики",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
