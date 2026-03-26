import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { analyzeVoiceNoteTranscript } from "@/lib/voice/voice-note-transcript-analysis";

const MIN_TRANSCRIPT_LEN = 3;

/**
 * POST /api/voice-notes/[id]/analyze
 * Пересчитывает и сохраняет server-backed analysisJson для заметки текущего coach.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await ctx.params;
  const noteId = typeof id === "string" ? id.trim() : "";
  if (!noteId) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  try {
    const note = await prisma.voiceNote.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        coachId: true,
        transcript: true,
        playerId: true,
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    if (note.coachId !== user!.id) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const transcript = note.transcript?.trim() ?? "";
    if (transcript.length < MIN_TRANSCRIPT_LEN) {
      return NextResponse.json(
        { error: "Недостаточно текста для анализа" },
        { status: 400 }
      );
    }

    let playerName: string | undefined;
    if (note.playerId) {
      const player = await prisma.player.findUnique({
        where: { id: note.playerId },
        select: { firstName: true, lastName: true },
      });
      if (player) {
        playerName =
          [player.firstName, player.lastName].filter(Boolean).join(" ").trim() || undefined;
      }
    }

    const analysisJson = analyzeVoiceNoteTranscript({
      text: transcript,
      playerName,
    });

    const updated = await prisma.voiceNote.update({
      where: { id: noteId },
      data: { analysisJson },
    });

    return NextResponse.json({
      id: updated.id,
      analysisJson,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/voice-notes/[id]/analyze failed:", error);
    return NextResponse.json(
      {
        error: "Не удалось выполнить анализ",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
