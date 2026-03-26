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
 * GET /api/reports
 * List coach-authored reports (incl. voice-created).
 */
export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const reports = await prisma.report.findMany({
      where: { coachId: user!.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const playerIds = Array.from(
      new Set(reports.map((r) => r.playerId).filter((v): v is string => typeof v === "string" && v.length > 0))
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
      reports.map((r) => ({
        id: r.id,
        playerId: r.playerId,
        playerName: r.playerId ? playerNameById.get(r.playerId) ?? null : null,
        title: r.title,
        contentPreview: preview(r.content),
        createdAt: r.createdAt.toISOString(),
        voiceNoteId: r.voiceNoteId ?? null,
      }))
    );
  } catch (error) {
    console.error("GET /api/reports failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки отчётов",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports
 * Body: { playerId?: string, title: string, content: string, voiceNoteId?: string }
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
  const content = typeof o.content === "string" ? o.content.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Поле title обязательно" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Поле content обязательно" }, { status: 400 });
  }

  const resolved = await resolveOptionalPlayerForCoach(user!, o.playerId);
  if (!resolved.ok) return resolved.res;

  const voiceNote = await resolveOptionalVoiceNoteForCoach(user!, o.voiceNoteId);
  if (!voiceNote.ok) return voiceNote.res;

  try {
    const created = await prisma.report.create({
      data: {
        coachId: user!.id,
        playerId: resolved.playerId,
        title,
        content,
        voiceNoteId: voiceNote.voiceNoteId,
      },
    });
    return NextResponse.json(created);
  } catch (error) {
    console.error("POST /api/reports failed:", error);
    return NextResponse.json(
      {
        error: "Не удалось создать отчёт",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
