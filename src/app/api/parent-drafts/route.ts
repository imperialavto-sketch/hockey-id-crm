import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  resolveOptionalPlayerForCoach,
  resolveOptionalVoiceNoteForCoach,
} from "@/lib/coach-create-entity-helpers";

/**
 * POST /api/parent-drafts
 * Body: { playerId?: string, text: string, voiceNoteId?: string }
 * Auth: CRM role (coach). coachId = authenticated user id.
 *
 * Note: distinct from CoachSessionParentDraft (synced session drafts).
 * This is a standalone coach-authored draft row for create-from-voice etc.
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
  const text = typeof o.text === "string" ? o.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "Поле text обязательно" }, { status: 400 });
  }

  const resolved = await resolveOptionalPlayerForCoach(user!, o.playerId);
  if (!resolved.ok) return resolved.res;

  const voiceNote = await resolveOptionalVoiceNoteForCoach(user!, o.voiceNoteId);
  if (!voiceNote.ok) return voiceNote.res;

  try {
    const created = await prisma.parentDraft.create({
      data: {
        coachId: user!.id,
        playerId: resolved.playerId,
        text,
        voiceNoteId: voiceNote.voiceNoteId,
      },
    });
    return NextResponse.json(created);
  } catch (error) {
    console.error("POST /api/parent-drafts failed:", error);
    return NextResponse.json(
      {
        error: "Не удалось создать черновик",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
