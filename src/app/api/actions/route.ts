import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  resolveOptionalPlayerForCoach,
  resolveOptionalVoiceNoteForCoach,
} from "@/lib/coach-create-entity-helpers";

function preview(text: string, maxLen = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

/**
 * GET /api/actions
 * List coach-authored action items (incl. voice-created).
 */
export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const items = await prisma.actionItem.findMany({
      where: { coachId: user!.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const playerIds = Array.from(
      new Set(items.map((x) => x.playerId).filter((v): v is string => typeof v === "string" && v.length > 0))
    );
    const players = playerIds.length
      ? await prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const playerNameById = new Map(
      players.map((p) => [p.id, [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Игрок"])
    );

    return NextResponse.json(
      items.map((x) => ({
        id: x.id,
        title: x.title,
        descriptionPreview: preview(x.description),
        status: x.status,
        createdAt: x.createdAt.toISOString(),
        playerId: x.playerId,
        playerName: x.playerId ? playerNameById.get(x.playerId) ?? null : null,
        voiceNoteId: x.voiceNoteId ?? null,
      }))
    );
  } catch (error) {
    console.error("GET /api/actions failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки задач",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/actions
 * Body: { playerId?: string, title: string, description: string, voiceNoteId?: string }
 * Auth: CRM role (coach). coachId = authenticated user id.
 */
export async function POST(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Тело запроса обязательно" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const description =
    typeof o.description === "string" ? o.description.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Поле title обязательно" }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json(
      { error: "Поле description обязательно" },
      { status: 400 }
    );
  }

  const resolved = await resolveOptionalPlayerForCoach(user!, o.playerId);
  if (!resolved.ok) return resolved.res;

  const voiceNote = await resolveOptionalVoiceNoteForCoach(user!, o.voiceNoteId);
  if (!voiceNote.ok) return voiceNote.res;

  try {
    const created = await prisma.actionItem.create({
      data: {
        coachId: user!.id,
        playerId: resolved.playerId,
        title,
        description,
        voiceNoteId: voiceNote.voiceNoteId,
      },
    });
    return NextResponse.json(created);
  } catch (error) {
    console.error("POST /api/actions failed:", error);
    return NextResponse.json(
      {
        error: "Не удалось создать задачу",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
