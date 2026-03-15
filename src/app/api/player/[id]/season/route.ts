import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
    }

    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { teamName, season, league, coach, gamesPlayed, goals, assists, penalties } = body;

    if (!teamName || !season) {
      return NextResponse.json(
        { error: "Название команды и сезон обязательны" },
        { status: 400 }
      );
    }

    const stats = {
      gamesPlayed: Number(gamesPlayed) ?? 0,
      goals: Number(goals) ?? 0,
      assists: Number(assists) ?? 0,
      penalties: Number(penalties) ?? 0,
    };

    const teamHistory = await prisma.teamHistory.create({
      data: {
        playerId: id,
        teamName: String(teamName).trim(),
        season: String(season).trim(),
        league: league ? String(league).trim() : "",
        coach: coach ? String(coach).trim() : null,
        stats,
      },
    });

    return NextResponse.json(teamHistory);
  } catch (error) {
    console.error("POST /api/player/[id]/season failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка добавления сезона",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
