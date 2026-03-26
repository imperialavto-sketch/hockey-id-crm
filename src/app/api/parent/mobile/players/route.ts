import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { getParentPlayers } from "@/lib/parent-players";

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

    const mapped = players.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      birthYear: p.birthYear,
      age: new Date().getFullYear() - p.birthYear,
      position: p.position ?? "Нападающий",
      number: p.profile?.jerseyNumber ?? 0,
      team: p.team?.name ?? "",
      parentName: p.parent
        ? `${p.parent.firstName} ${p.parent.lastName}`.trim()
        : "",
      status: p.status ?? "active",
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/parent/mobile/players failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки игроков" },
      { status: 500 }
    );
  }
}
