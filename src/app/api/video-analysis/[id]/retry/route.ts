/**
 * POST /api/video-analysis/:id/retry
 * Stub: returns { success: true }. Optionally updates request in store.
 */

import { NextRequest, NextResponse } from "next/server";
import { PARENT_ID_HEADER } from "@/lib/api-auth";
import {
  getVideoAnalysisRequest,
  updateVideoAnalysisRequest,
} from "@/lib/video-analysis-stub";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const _parentId = req.headers.get(PARENT_ID_HEADER)?.trim(); // optional: for future audit

  if (!id) {
    return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
  }

  const existing = getVideoAnalysisRequest(id);
  if (existing) {
    updateVideoAnalysisRequest(id, {
      analysisStatus: "processing",
      uploadStatus: "success",
    });
  }

  return NextResponse.json({ success: true });
}
