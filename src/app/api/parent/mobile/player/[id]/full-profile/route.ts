import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }

  const user = await getAuthFromRequest(req);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const canAccess = await canParentAccessPlayer(user.parentId, id);
  if (!canAccess) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      team: true,
      parent: true,
      profile: true,
      stats: { orderBy: { season: "desc" }, take: 1 },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  const stats = player.stats[0];
  const [trainings, ratings, notes, analyses] = await Promise.all([
    player.teamId
      ? prisma.training.findMany({
          where: { teamId: player.teamId },
          orderBy: { startTime: "asc" },
        })
      : [],
    prisma.coachRating.findMany({
      where: { playerId: id, recommendation: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.playerNote.findMany({
      where: { playerId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.playerVideoAnalysis.findMany({
      where: { playerId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const schedule = trainings.map((t) => {
    const d = new Date(t.startTime);
    return {
      id: t.id,
      day: DAY_NAMES[d.getDay()],
      title: t.title,
      time: d.toTimeString().slice(0, 5),
    };
  });

  const recommendations = [
    ...ratings.filter((r) => r.recommendation?.trim()).map((r) => ({ id: `r-${r.id}`, text: r.recommendation!.trim() })),
    ...notes.filter((n) => n.note?.trim()).map((n) => ({ id: `n-${n.id}`, text: n.note!.trim() })),
  ];

  return NextResponse.json({
    player: {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      birthYear: player.birthYear,
      age: new Date().getFullYear() - player.birthYear,
      position: player.position ?? "Нападающий",
      number: player.profile?.jerseyNumber ?? 0,
      team: player.team?.name ?? "",
      teamId: player.teamId,
      parentName: player.parent
        ? `${player.parent.firstName} ${player.parent.lastName}`.trim()
        : "",
      status: player.status ?? "active",
    },
    stats: stats
      ? { games: stats.games, goals: stats.goals, assists: stats.assists, points: stats.points, pim: stats.pim }
      : null,
    schedule,
    recommendations,
    progressHistory: [],
    achievements: { unlocked: [], locked: [] },
    videoAnalyses: analyses.map((a) => ({
      id: a.id,
      playerId: a.playerId,
      createdAt: a.createdAt.toISOString(),
      analysisStatus: "completed",
    })),
  });
}
