/**
 * Parent Mobile API — video analysis for a player.
 * GET: list analyses
 * POST: upload video and trigger analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";
import { analyzeVideo } from "@/lib/ai/video-analysis";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playerId } = await params;
  if (!playerId) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }

  const user = await getAuthFromRequest(req);
  if (user?.role !== "PARENT" || !user?.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const canAccess = await canParentAccessPlayer(user.parentId, playerId);
  if (!canAccess) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const analyses = await prisma.playerVideoAnalysis.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
  });

  const items = analyses.map((a) => ({
    id: a.id,
    playerId,
    uploadedByUserId: user.parentId,
    title: undefined,
    description: undefined,
    videoUrl: a.videoUrl ?? undefined,
    storageKey: undefined,
    durationSeconds: 0,
    fileSizeBytes: 0,
    mimeType: "video/mp4",
    thumbnailUrl: undefined,
    uploadStatus: "success",
    analysisStatus: "completed",
    errorMessage: undefined,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    completedAt: a.createdAt.toISOString(),
  }));

  return NextResponse.json(items);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playerId } = await params;
  if (!playerId) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }

  const user = await getAuthFromRequest(req);
  if (user?.role !== "PARENT" || !user?.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const canAccess = await canParentAccessPlayer(user.parentId, playerId);
  if (!canAccess) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { team: true },
  });
  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  let videoUrl: string;
  let description: string | undefined;
  let exerciseType: string | undefined;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("video") as File | null;
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Не выбран файл видео" },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Файл слишком большой (макс. 100 МБ)" },
        { status: 400 }
      );
    }

    description = (formData.get("description") as string) || undefined;
    exerciseType = (formData.get("exerciseType") as string) || undefined;

    const ext = path.extname(file.name) || ".mp4";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "videos", playerId);
    await mkdir(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buf);
    videoUrl = `/uploads/videos/${playerId}/${filename}`;
  } else {
    const body = await req.json().catch(() => ({}));
    const url = body.videoUrl as string | undefined;
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Нужен video (файл) или videoUrl" },
        { status: 400 }
      );
    }
    videoUrl = url;
    description = body.description;
    exerciseType = body.exerciseType;
  }

  try {
    const analysis = await analyzeVideo({
      playerName: `${player.firstName} ${player.lastName}`,
      playerTeam: player.team?.name ?? "",
      videoDescription: description || undefined,
      exerciseType: exerciseType || undefined,
    });

    const record = await prisma.playerVideoAnalysis.create({
      data: {
        playerId,
        videoUrl,
        analysisText: analysis.summary,
        strengths: analysis.strengths,
        growthAreas: analysis.growthAreas,
        recommendations: analysis.recommendations,
      },
    });

    return NextResponse.json({
      id: record.id,
      playerId,
      videoUrl: record.videoUrl,
      analysisText: record.analysisText,
      strengths: analysis.strengths,
      growthAreas: analysis.growthAreas,
      recommendations: analysis.recommendations,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("Video analysis failed:", err);
    return NextResponse.json(
      {
        error: "Ошибка анализа видео",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
