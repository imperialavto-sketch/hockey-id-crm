/**
 * GET /api/me/players — alias for parent-app compatibility.
 * POST /api/me/players — create player for current parent (parentId from auth only).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { getParentPlayers, createParentPlayer } from "@/lib/parent-players";
import type { ParentPlayerList } from "@/lib/parent-players";

/** BackendPlayer shape expected by parent-app playerService */
function mapToBackendPlayer(p: ParentPlayerList) {
  const age = new Date().getFullYear() - p.birthYear;
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    name: `${p.firstName} ${p.lastName}`.trim() || "Игрок",
    birthYear: p.birthYear,
    age,
    position: p.position ?? null,
    parentId: p.parentId ?? null,
    teamId: p.teamId ?? null,
    team: p.team?.name ?? null,
    avatarUrl: p.photoUrl ?? null,
    avatar: p.photoUrl ?? null,
    games: null,
    goals: null,
    assists: null,
    points: null,
    pim: null,
    stats: null,
  };
}

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);

  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  try {
    const players = await getParentPlayers(user.parentId);
    const items = players.map(mapToBackendPlayer);
    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/me/players failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки игроков" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthFromRequest(req);

  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Неверный JSON" },
      { status: 400 }
    );
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const firstName = typeof o.firstName === "string" ? o.firstName.trim() : "";
  const lastName = typeof o.lastName === "string" ? o.lastName.trim() : "";
  const birthYearRaw = o.birthYear;
  const position = typeof o.position === "string" ? o.position.trim() || undefined : undefined;

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "firstName и lastName обязательны" },
      { status: 400 }
    );
  }

  if (birthYearRaw == null || birthYearRaw === "") {
    return NextResponse.json(
      { error: "birthYear обязателен" },
      { status: 400 }
    );
  }

  const birthYear = Number(birthYearRaw);
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(birthYear) || birthYear < 1990 || birthYear > currentYear) {
    return NextResponse.json(
      { error: "Некорректный год рождения" },
      { status: 400 }
    );
  }

  if (o.parentId != null) {
    return NextResponse.json(
      { error: "parentId передавать нельзя" },
      { status: 400 }
    );
  }

  try {
    const player = await createParentPlayer(user.parentId, {
      firstName,
      lastName,
      birthYear,
      position,
    });
    const item = mapToBackendPlayer(player);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("POST /api/me/players failed:", error);
    return NextResponse.json(
      { error: "Не удалось добавить игрока" },
      { status: 500 }
    );
  }
}
