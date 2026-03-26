/**
 * POST /api/voice/upload
 * MVP audio upload endpoint for future STT pipeline.
 *
 * - Auth: CRM role (coach).
 * - Input: multipart/form-data with field "audio" (Blob/File).
 * - Stores file temporarily under OS tmp dir.
 * - Returns metadata for next processing stage.
 */

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import type { VoiceProcessingStatus } from "@/lib/voice/pipeline-contract";
import { saveVoiceUploadStatus, updateVoiceUploadStatus } from "@/lib/voice/upload-registry";
import { isSttConfigured, transcribeAudioWithOpenAi } from "@/lib/voice/stt-provider";
import { deriveRecapFromTranscript } from "@/lib/voice/derive-recap";

const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
]);
function extByMime(mime: string): string {
  switch (mime) {
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "audio/wav":
    case "audio/x-wav":
      return ".wav";
    case "audio/webm":
      return ".webm";
    case "audio/ogg":
      return ".ogg";
    case "audio/mp4":
    case "audio/x-m4a":
      return ".m4a";
    case "audio/aac":
      return ".aac";
    default:
      return "";
  }
}

function runSttProcessingInBackground(params: {
  coachId: string;
  uploadId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}) {
  const { coachId, uploadId, fileName, mimeType, bytes } = params;
  void (async () => {
    const processingStartedAt = new Date().toISOString();
    console.info("[voice-upload] processing started", { uploadId, coachId });
    updateVoiceUploadStatus({
      uploadId,
      coachId,
      mutate: (current) => ({
        ...current,
        upload: {
          ...current.upload,
          status: "processing",
          updatedAt: processingStartedAt,
        },
        transcript: {
          status: "pending",
          updatedAt: processingStartedAt,
          error: null,
          text: null,
        },
        summary: {
          status: "pending",
          updatedAt: processingStartedAt,
          error: null,
          text: null,
          highlights: null,
        },
      }),
    });

    try {
      const transcript = await transcribeAudioWithOpenAi({ bytes, fileName, mimeType });
      const at = new Date().toISOString();
      updateVoiceUploadStatus({
        uploadId,
        coachId,
        mutate: (current) => ({
          ...current,
          upload: {
            ...current.upload,
            status: "processed",
            updatedAt: at,
          },
          transcript: {
            status: "ready",
            updatedAt: at,
            error: null,
            text: transcript,
          },
          summary: {
            status: "pending",
            updatedAt: at,
            error: null,
            text: null,
            highlights: null,
          },
        }),
      });
      console.info("[voice-upload] processing success", {
        uploadId,
        coachId,
        transcriptLength: transcript.length,
      });

      console.info("[voice-upload] derive started", { uploadId, coachId });
      try {
        const recap = await deriveRecapFromTranscript({ transcript });
        const doneAt = new Date().toISOString();
        updateVoiceUploadStatus({
          uploadId,
          coachId,
          mutate: (current) => ({
            ...current,
            summary: {
              status: "ready",
              updatedAt: doneAt,
              error: null,
              text: recap.summary,
              highlights: recap.highlights,
            },
            derived: {
              actionItems: { status: "ready", updatedAt: doneAt, error: null },
              reports: { status: "ready", updatedAt: doneAt, error: null },
              parentDrafts: { status: "ready", updatedAt: doneAt, error: null },
            },
          }),
        });
        console.info("[voice-upload] derive success", {
          uploadId,
          coachId,
          highlightsCount: recap.highlights.length,
        });
      } catch (deriveErr) {
        const failAt = new Date().toISOString();
        const deriveMessage =
          deriveErr instanceof Error ? deriveErr.message : "Derive step failed";
        updateVoiceUploadStatus({
          uploadId,
          coachId,
          mutate: (current) => ({
            ...current,
            summary: {
              ...current.summary,
              status: "failed",
              updatedAt: failAt,
              error: deriveMessage,
              text: null,
              highlights: null,
            },
            derived: {
              actionItems: { status: "failed", updatedAt: failAt, error: deriveMessage },
              reports: { status: "failed", updatedAt: failAt, error: deriveMessage },
              parentDrafts: { status: "failed", updatedAt: failAt, error: deriveMessage },
            },
          }),
        });
        console.error("[voice-upload] derive failed", { uploadId, coachId, error: deriveMessage });
      }
    } catch (e) {
      const at = new Date().toISOString();
      const errorMessage = e instanceof Error ? e.message : "STT processing failed";
      updateVoiceUploadStatus({
        uploadId,
        coachId,
        mutate: (current) => ({
          ...current,
          upload: {
            ...current.upload,
            status: "failed",
            updatedAt: at,
          },
          transcript: {
            status: "failed",
            updatedAt: at,
            error: errorMessage,
            text: null,
          },
          summary: {
            status: "failed",
            updatedAt: at,
            error: errorMessage,
            text: null,
            highlights: null,
          },
          derived: {
            actionItems: { status: "failed", updatedAt: at, error: errorMessage },
            reports: { status: "failed", updatedAt: at, error: errorMessage },
            parentDrafts: { status: "failed", updatedAt: at, error: errorMessage },
          },
        }),
      });
      console.error("[voice-upload] processing failed", { uploadId, coachId, error: errorMessage });
    }
  })();
}

export async function POST(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Ожидается multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof Blob)) {
      return NextResponse.json(
        { error: "Файл аудио не передан" },
        { status: 400 }
      );
    }

    const mimeType = (audio.type || "application/octet-stream").toLowerCase();
    if (!ALLOWED_AUDIO_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Неподдерживаемый тип аудио" },
        { status: 400 }
      );
    }

    if (audio.size <= 0) {
      return NextResponse.json(
        { error: "Пустой аудиофайл" },
        { status: 400 }
      );
    }

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Файл слишком большой (максимум 15 МБ)" },
        { status: 400 }
      );
    }

    const uploadId = `voice_up_${randomUUID()}`;
    const ext = extByMime(mimeType);
    const fileName = `${uploadId}${ext}`;

    const coachDir = path.join(tmpdir(), "hockey-id-voice-mvp", user!.id);
    await mkdir(coachDir, { recursive: true });

    const filePath = path.join(coachDir, fileName);
    const buffer = Buffer.from(await audio.arrayBuffer());
    await writeFile(filePath, buffer);

    const now = new Date().toISOString();
    const sttConfigured = isSttConfigured();
    const processing: VoiceProcessingStatus = {
      upload: {
        uploadId,
        status: sttConfigured ? "uploaded" : "failed",
        fileName,
        mimeType,
        sizeBytes: audio.size,
        durationSeconds: null,
        createdAt: now,
        updatedAt: now,
        provider: sttConfigured ? "openai_whisper" : "not_configured",
      },
      transcript: {
        status: sttConfigured ? "pending" : "failed",
        updatedAt: now,
        error: sttConfigured ? null : "OPENAI_API_KEY не настроен на сервере",
        text: null,
      },
      summary: {
        status: "pending",
        updatedAt: now,
        error: null,
        text: null,
        highlights: null,
      },
      derived: {
        actionItems: { status: "pending", updatedAt: now, error: null },
        reports: { status: "pending", updatedAt: now, error: null },
        parentDrafts: { status: "pending", updatedAt: now, error: null },
      },
    };
    saveVoiceUploadStatus({ coachId: user!.id, processing });
    console.info("[voice-upload] upload started", { uploadId, coachId: user!.id, size: audio.size, mimeType });
    if (sttConfigured) {
      runSttProcessingInBackground({
        coachId: user!.id,
        uploadId,
        fileName,
        mimeType,
        bytes: buffer,
      });
    } else {
      console.warn("[voice-upload] STT skipped: OPENAI_API_KEY not configured", { uploadId });
    }

    return NextResponse.json({
      ok: true,
      uploadId,
      fileName,
      mimeType,
      size: audio.size,
      status: "uploaded",
      transcript: null,
      durationSeconds: null,
      sttStatus: sttConfigured ? "processing" : "not_configured",
      sttError: sttConfigured ? null : "OPENAI_API_KEY не настроен на сервере",
      processing,
    });
  } catch (error) {
    console.error("POST /api/voice/upload failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки аудио",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

