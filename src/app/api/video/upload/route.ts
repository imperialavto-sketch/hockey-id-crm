/**
 * POST /api/video/upload
 * Legacy stub (dev). Production: use POST /api/parent/mobile/player/:playerId/video-analysis (multipart).
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Этот endpoint отключён. Загрузка видео: POST /api/parent/mobile/player/:playerId/video-analysis",
        code: "VIDEO_UPLOAD_USE_PARENT_MOBILE_API",
      },
      { status: 410 }
    );
  }

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
