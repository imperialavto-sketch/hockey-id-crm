import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "view");
  if (res) return res;
  try {
    const { id } = await params;

    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) return NextResponse.json(null);
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const profile = await prisma.playerProfile.findUnique({
      where: { playerId: id },
    });

    if (!profile) {
      return NextResponse.json(null);
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error("GET /api/players/[id]/profile failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки профиля",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "edit");
  if (res) return res;
  try {
    const { id } = await params;
    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const body = await req.json().catch(() => ({}));
    const { height, weight, jerseyNumber, shoots } = body;

    const toInt = (v: unknown): number | null => {
      if (v == null || v === "") return null;
      const n = typeof v === "number" ? v : parseInt(String(v), 10);
      return isNaN(n) ? null : n;
    };

    const existing = await prisma.playerProfile.findUnique({
      where: { playerId: id },
    });

    let profile;
    if (existing) {
      profile = await prisma.playerProfile.update({
        where: { playerId: id },
        data: {
          height: toInt(height),
          weight: toInt(weight),
          jerseyNumber: toInt(jerseyNumber),
          shoots: shoots != null && String(shoots).trim() !== "" ? String(shoots).trim() : null,
        },
      });
    } else {
      profile = await prisma.playerProfile.create({
        data: {
          playerId: id,
          height: toInt(height),
          weight: toInt(weight),
          jerseyNumber: toInt(jerseyNumber),
          shoots: shoots != null && String(shoots).trim() !== "" ? String(shoots).trim() : null,
        },
      });
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error("POST /api/players/[id]/profile failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка сохранения профиля",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return POST(req, { params });
}
