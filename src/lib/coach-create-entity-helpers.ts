import { NextResponse } from "next/server";
import type { ApiUser } from "@/lib/api-auth";
import { canAccessPlayer } from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";

/**
 * Validates optional playerId for coach-owned create endpoints.
 * Returns normalized playerId or an error response.
 */
export async function resolveOptionalPlayerForCoach(
  user: ApiUser,
  playerIdRaw: unknown
): Promise<
  | { ok: true; playerId: string | null }
  | { ok: false; res: NextResponse }
> {
  if (playerIdRaw == null || playerIdRaw === "") {
    return { ok: true, playerId: null };
  }
  if (typeof playerIdRaw !== "string") {
    return {
      ok: false,
      res: NextResponse.json({ error: "Некорректный playerId" }, { status: 400 }),
    };
  }
  const playerId = playerIdRaw.trim();
  if (!playerId) {
    return { ok: true, playerId: null };
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { team: { select: { schoolId: true } } },
  });

  if (!player) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Игрок не найден" }, { status: 404 }),
    };
  }

  if (!canAccessPlayer(user, player)) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Нет доступа к игроку" }, { status: 403 }),
    };
  }

  return { ok: true, playerId };
}

/**
 * Validates optional voiceNoteId for coach-owned create endpoints.
 * Ensures the note exists and belongs to the authenticated coach.
 */
export async function resolveOptionalVoiceNoteForCoach(
  user: ApiUser,
  voiceNoteIdRaw: unknown
): Promise<
  | { ok: true; voiceNoteId: string | null }
  | { ok: false; res: NextResponse }
> {
  if (voiceNoteIdRaw == null || voiceNoteIdRaw === "") {
    return { ok: true, voiceNoteId: null };
  }
  if (typeof voiceNoteIdRaw !== "string") {
    return {
      ok: false,
      res: NextResponse.json({ error: "Некорректный voiceNoteId" }, { status: 400 }),
    };
  }
  const trimmed = voiceNoteIdRaw.trim();
  if (!trimmed) {
    return { ok: true, voiceNoteId: null };
  }

  const note = await prisma.voiceNote.findUnique({
    where: { id: trimmed },
    select: { id: true, coachId: true },
  });

  if (!note) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Заметка не найдена" }, { status: 404 }),
    };
  }

  if (note.coachId !== user.id) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Нет доступа к заметке" }, { status: 403 }),
    };
  }

  return { ok: true, voiceNoteId: note.id };
}
