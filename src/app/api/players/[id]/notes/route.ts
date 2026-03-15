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
    if (!player) return NextResponse.json([], { status: 200 });
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const notes = await prisma.playerNote.findMany({
      where: { playerId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(notes);
  } catch (error) {
    console.error("GET /api/players/[id]/notes failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки заметок",
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
    const { note } = body;

    if (!note || typeof note !== "string" || !note.trim()) {
      return NextResponse.json(
        { error: "Текст заметки обязателен" },
        { status: 400 }
      );
    }

    const created = await prisma.playerNote.create({
      data: {
        playerId: id,
        note: String(note).trim(),
      },
    });
    return NextResponse.json(created);
  } catch (error) {
    console.error("POST /api/players/[id]/notes failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка сохранения заметки",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
