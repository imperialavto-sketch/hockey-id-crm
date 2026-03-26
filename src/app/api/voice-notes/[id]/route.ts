import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { buildVoiceProcessingFromVoiceNote } from "@/lib/voice/voice-note-serializer";

export async function GET(
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
    const note = await prisma.voiceNote.findFirst({
      where: { id: noteId, coachId: user!.id },
    });
    if (!note) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json({
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      processing: buildVoiceProcessingFromVoiceNote(note),
    });
  } catch (error) {
    console.error("GET /api/voice-notes/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки заметки",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

