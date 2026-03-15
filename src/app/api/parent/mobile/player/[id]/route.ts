/**
 * Parent Mobile API — single player details.
 */

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

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      team: true,
      parent: true,
      profile: true,
      stats: { orderBy: { season: "desc" } },
      coachRatings: { where: { recommendation: { not: null } } },
      notes: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  if (user?.role !== "PARENT" || !user?.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }
  const canAccess = await canParentAccessPlayer(user.parentId, player.id);
  if (!canAccess) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const mapped = {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    birthYear: player.birthYear,
    age: new Date().getFullYear() - player.birthYear,
    position: player.position,
    number: player.profile?.jerseyNumber ?? 0,
    team: player.team?.name ?? "",
    teamId: player.teamId,
    parentName: player.parent
      ? `${player.parent.firstName} ${player.parent.lastName}`.trim()
      : "",
    status: player.status,
    stats: player.stats[0] ?? null,
    coachRatings: player.coachRatings,
    notes: player.notes,
  };

  return NextResponse.json(mapped);
}
