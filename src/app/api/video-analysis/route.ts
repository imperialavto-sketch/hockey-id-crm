/**
 * POST /api/video-analysis
 * Legacy in-memory stub (dev). Production: POST /api/parent/mobile/player/:playerId/video-analysis.
 */

import { NextRequest, NextResponse } from "next/server";
import { PARENT_ID_HEADER } from "@/lib/api-auth";
import { setVideoAnalysisRequest } from "@/lib/video-analysis-stub";

function nextId(): string {
  return `va_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Этот endpoint отключён. Создание анализа: POST /api/parent/mobile/player/:playerId/video-analysis",
        code: "VIDEO_ANALYSIS_USE_PARENT_MOBILE_API",
      },
      { status: 410 }
    );
  }

  const parentId = req.headers.get(PARENT_ID_HEADER)?.trim() ?? "";

  try {
    const body = await req.json().catch(() => ({}));
    const playerId = body.playerId as string | undefined;
    const videoId = body.videoId as string | undefined;

    if (!playerId || !videoId) {
      return NextResponse.json(
        { error: "Требуются playerId и videoId" },
        { status: 400 }
      );
    }

    const id = nextId();
    const now = new Date().toISOString();
    const request = {
      id,
      playerId: String(playerId),
      uploadedByUserId: parentId || "unknown",
      videoUrl: `https://storage.hockeyid.mock/video/${videoId}.mp4`,
      uploadStatus: "success",
      analysisStatus: "processing",
      createdAt: now,
      updatedAt: now,
    };

    setVideoAnalysisRequest(request);

    return NextResponse.json({
      id: request.id,
      playerId: request.playerId,
      uploadedByUserId: request.uploadedByUserId,
      videoUrl: request.videoUrl,
      uploadStatus: request.uploadStatus,
      analysisStatus: request.analysisStatus,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    });
  } catch (err) {
    console.error("[video-analysis POST]", err);
    return NextResponse.json(
      { error: "Ошибка создания анализа" },
      { status: 500 }
    );
  }
}
