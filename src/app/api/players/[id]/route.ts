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

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        team: true,
        profile: true,
        stats: { orderBy: { season: "desc" } },
        notes: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    return NextResponse.json(player);
  } catch (error) {
    console.error("GET /api/players/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки игрока",
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
  const { user, res } = await requirePermission(req, "players", "edit");
  if (res) return res;
  try {
    const { id } = await params;
    const existing = await prisma.player.findUnique({
      where: { id },
      include: { team: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const accessRes = checkPlayerAccess(user!, { ...existing, team: existing.team ?? undefined });
    if (accessRes) return accessRes;

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};
    const fields = ["firstName", "lastName", "birthYear", "birthDate", "position", "grip", "height", "weight", "city", "country", "internationalRating", "status", "comment", "teamId"];
    for (const f of fields) {
      if (f in body) update[f] = body[f];
    }
    if ("teamId" in update && update.teamId) {
      const { canAccessTeam } = await import("@/lib/data-scope");
      const team = await prisma.team.findUnique({ where: { id: String(update.teamId) }, select: { id: true, schoolId: true } });
      if (team && !canAccessTeam(user!, team)) {
        return NextResponse.json({ error: "Нет доступа к указанной команде" }, { status: 403 });
      }
    }
    const player = await prisma.player.update({
      where: { id },
      data: update,
      include: { team: true },
    });
    return NextResponse.json(player);
  } catch (error) {
    console.error("PUT /api/players/[id] failed:", error);
    return NextResponse.json({ error: "Ошибка обновления игрока" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "delete");
  if (res) return res;
  try {
    const { id } = await params;
    const existing = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const accessRes = checkPlayerAccess(user!, { ...existing, team: existing.team ?? undefined });
    if (accessRes) return accessRes;

    await prisma.player.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/players/[id] failed:", error);
    return NextResponse.json({ error: "Ошибка удаления игрока" }, { status: 500 });
  }
}
