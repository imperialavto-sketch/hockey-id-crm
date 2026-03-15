/**
 * POST /api/video/upload
 * Accept multipart/form-data (field: video). No file persistence yet.
 * Returns mock-compatible { videoId: "vid_<timestamp>" }.
 * Reads x-parent-id header if provided; does not require auth for stub.
 */

import { NextRequest, NextResponse } from "next/server";
import { PARENT_ID_HEADER } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const parentId = req.headers.get(PARENT_ID_HEADER)?.trim();

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Ожидается multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("video");
    const playerId = formData.get("playerId");

    // Optional: validate file exists; for stub we don't persist, so just consume the body
    if (file instanceof Blob) {
      // Consume so request body is read (avoids hang)
      await file.arrayBuffer();
    }

    const videoId = `vid_${Date.now()}`;
    return NextResponse.json({ videoId });
  } catch (err) {
    console.error("[video/upload]", err);
    return NextResponse.json(
      { error: "Ошибка загрузки видео" },
      { status: 500 }
    );
  }
}
