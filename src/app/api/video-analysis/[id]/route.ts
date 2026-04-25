/**
 * GET /api/video-analysis/:id
 * Legacy stub (dev). Production: GET /api/parent/mobile/player/:playerId/video-analysis/:analysisId
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getVideoAnalysisRequest,
  getVideoAnalysisResult,
} from "@/lib/video-analysis-stub";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Этот endpoint отключён. Чтение анализа: GET /api/parent/mobile/player/:playerId/video-analysis/:analysisId",
        code: "VIDEO_ANALYSIS_USE_PARENT_MOBILE_API",
      },
      { status: 410 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
  }

  const request = getVideoAnalysisRequest(id);
  if (!request) {
    return NextResponse.json({ error: "Анализ не найден" }, { status: 404 });
  }

  const result = getVideoAnalysisResult(id);

  return NextResponse.json({
    request: {
      id: request.id,
      playerId: request.playerId,
      uploadedByUserId: request.uploadedByUserId,
      videoUrl: request.videoUrl,
      uploadStatus: request.uploadStatus,
      analysisStatus: request.analysisStatus,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    },
    result: result
      ? {
          id: result.id,
          analysisRequestId: result.analysisRequestId,
          summary: result.summary,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          recommendations: result.recommendations,
          keyMoments: result.keyMoments,
          confidenceScore: result.confidenceScore,
          createdAt: result.createdAt,
        }
      : null,
  });
}
