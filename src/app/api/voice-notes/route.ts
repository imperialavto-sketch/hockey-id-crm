import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { resolveOptionalPlayerForCoach } from "@/lib/coach-create-entity-helpers";
import {
  buildVoiceProcessingFromVoiceNote,
  parseOptionalVoiceNoteAnalysisJson,
  voiceNoteHasStoredAnalysisJson,
} from "@/lib/voice/voice-note-serializer";
import { getVoiceUploadStatus } from "@/lib/voice/upload-registry";

type SuggestionInput = { intent: string; label?: string; score?: number };

function buildPreview(text: string, maxLen = 140): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const notes = await prisma.voiceNote.findMany({
      where: { coachId: user!.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const playerIds = Array.from(
      new Set(
        notes
          .map((n) => n.playerId)
          .filter((x): x is string => typeof x === "string" && x.length > 0)
      )
    );
    const players =
      playerIds.length > 0
        ? await prisma.player.findMany({
            where: { id: { in: playerIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const playerNameById = new Map(
      players.map((p) => [
        p.id,
        [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Игрок",
      ])
    );

    return NextResponse.json(
      notes.map((n) => {
        const previewBase = n.summary?.trim() || n.transcript;
        return {
          id: n.id,
          playerId: n.playerId,
          playerName: n.playerId ? playerNameById.get(n.playerId) ?? null : null,
          summary: n.summary ?? null,
          transcriptPreview: buildPreview(previewBase),
          createdAt: n.createdAt.toISOString(),
          audioFileName: n.audioFileName ?? null,
          uploadId: n.uploadId ?? null,
          processing: buildVoiceProcessingFromVoiceNote(n),
          hasAnalysis: voiceNoteHasStoredAnalysisJson(n.analysisJson),
        };
      })
    );
  } catch (error) {
    console.error("GET /api/voice-notes failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки голосовых заметок",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voice-notes
 * Persist a voice note result (transcript + lightweight analysis + upload metadata).
 * Optional `analysisJson`: plain JSON object (client-side AI snapshot); invalid shapes are ignored.
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
    return NextResponse.json(
      { error: "Тело запроса обязательно" },
      { status: 400 }
    );
  }

  const o = body as Record<string, unknown>;
  let transcript = typeof o.transcript === "string" ? o.transcript.trim() : "";
  let summary = typeof o.summary === "string" ? o.summary.trim() : "";
  const uploadId = typeof o.uploadId === "string" ? o.uploadId.trim() : "";

  const processing = uploadId ? getVoiceUploadStatus(uploadId, user!.id) : null;
  if ((!transcript || transcript.length < 3) && processing) {
    const fromRegistry = processing?.transcript.text?.trim();
    if (fromRegistry && fromRegistry.length >= 3) {
      transcript = fromRegistry;
    }
  }
  if (!summary && processing?.summary.text?.trim()) {
    summary = processing.summary.text.trim();
  }

  if (!transcript || transcript.length < 3) {
    return NextResponse.json(
      { error: "Поле transcript обязательно" },
      { status: 400 }
    );
  }

  const resolved = await resolveOptionalPlayerForCoach(user!, o.playerId);
  if (!resolved.ok) return resolved.res;

  const audioFileName =
    typeof o.audioFileName === "string" ? o.audioFileName.trim() : "";
  const audioMimeType =
    typeof o.audioMimeType === "string" ? o.audioMimeType.trim() : "";
  const audioSizeBytes =
    typeof o.audioSizeBytes === "number" && Number.isFinite(o.audioSizeBytes)
      ? Math.max(0, Math.floor(o.audioSizeBytes))
      : null;

  const highlightsFromBody =
    Array.isArray(o.highlights)
      ? o.highlights.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, 12)
      : [];
  const highlightsFromProcessing = processing?.summary.highlights?.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, 12) ?? [];
  const highlights = highlightsFromBody.length > 0 ? highlightsFromBody : highlightsFromProcessing;
  const suggestionsRaw = Array.isArray(o.suggestions) ? o.suggestions : [];
  const suggestions: SuggestionInput[] = suggestionsRaw
    .filter((x) => x && typeof x === "object")
    .map((x) => x as Record<string, unknown>)
    .map((x) => ({
      intent: typeof x.intent === "string" ? x.intent : "",
      label: typeof x.label === "string" ? x.label : undefined,
      score: typeof x.score === "number" ? x.score : undefined,
    }))
    .filter((x) => x.intent.trim().length > 0)
    .slice(0, 8);

  const analysisJson = parseOptionalVoiceNoteAnalysisJson(o.analysisJson);

  // Dedup: same coach + uploadId should not create duplicates.
  if (uploadId) {
    const existing = await prisma.voiceNote.findFirst({
      where: { coachId: user!.id, uploadId },
    });
    if (existing) {
      if (analysisJson !== undefined) {
        const updated = await prisma.voiceNote.update({
          where: { id: existing.id },
          data: { analysisJson },
        });
        return NextResponse.json({
          ...updated,
          processing: buildVoiceProcessingFromVoiceNote(updated),
        });
      }
      return NextResponse.json({
        ...existing,
        processing: buildVoiceProcessingFromVoiceNote(existing),
      });
    }
  }

  try {
    const created = await prisma.voiceNote.create({
      data: {
        coachId: user!.id,
        playerId: resolved.playerId,
        transcript,
        summary: summary || null,
        highlightsJson: highlights.length > 0 ? highlights : undefined,
        suggestionsJson: suggestions.length > 0 ? suggestions : undefined,
        uploadId: uploadId || null,
        audioFileName: audioFileName || null,
        audioMimeType: audioMimeType || null,
        audioSizeBytes,
        ...(analysisJson !== undefined ? { analysisJson } : {}),
      },
    });
    return NextResponse.json({
      ...created,
      processing: buildVoiceProcessingFromVoiceNote(created),
    });
  } catch (error) {
    console.error("POST /api/voice-notes failed:", error);
    return NextResponse.json(
      {
        error: "Не удалось сохранить голосовую заметку",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

