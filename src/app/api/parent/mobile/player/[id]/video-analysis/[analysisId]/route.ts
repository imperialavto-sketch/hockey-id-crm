/**
 * Parent Mobile — single video analysis (Prisma PlayerVideoAnalysis).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; analysisId: string }> }
) {
  const { id: playerId, analysisId } = await params;
  if (!playerId || !analysisId) {
    return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
  }

  const user = await getAuthFromRequest(_req);
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

  const a = await prisma.playerVideoAnalysis.findFirst({
    where: { id: analysisId, playerId },
  });

  if (!a) {
    return NextResponse.json({ error: "Анализ не найден" }, { status: 404 });
  }

  const now = a.updatedAt.toISOString();
  const created = a.createdAt.toISOString();

  const request = {
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
    createdAt: created,
    updatedAt: now,
    completedAt: created,
  };

  const strengths = asStringArray(a.strengths);
  const growth = asStringArray(a.growthAreas);
  const recs = asStringArray(a.recommendations);

  const result = {
    id: `${a.id}-result`,
    analysisRequestId: a.id,
    summary: a.analysisText ?? "",
    strengths,
    weaknesses: growth,
    recommendations: recs,
    keyMoments: [] as string[],
    confidenceScore: 0,
    createdAt: created,
  };

  return NextResponse.json(
    { request, result },
    { headers: { "Cache-Control": "no-store" } }
  );
}
