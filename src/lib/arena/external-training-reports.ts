import type { ExternalTrainingReport, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function createExternalTrainingReport(params: {
  requestId: string;
  playerId: string;
  coachId: string;
  summary: string;
  focusAreas?: unknown;
  resultNotes?: string | null;
  nextSteps?: string | null;
}): Promise<ExternalTrainingReport> {
  const data: Prisma.ExternalTrainingReportCreateInput = {
    requestId: params.requestId.trim(),
    playerId: params.playerId.trim(),
    coachId: params.coachId.trim(),
    summary: params.summary.trim(),
    resultNotes: params.resultNotes?.trim() || null,
    nextSteps: params.nextSteps?.trim() || null,
  };
  if (params.focusAreas !== undefined) {
    data.focusAreas = params.focusAreas as Prisma.InputJsonValue;
  }

  return prisma.externalTrainingReport.create({ data });
}

export async function getExternalTrainingReportByRequestId(
  requestId: string
): Promise<ExternalTrainingReport | null> {
  return prisma.externalTrainingReport.findFirst({
    where: { requestId: requestId.trim() },
  });
}

export async function getLatestExternalTrainingReportForPlayer(
  playerId: string
): Promise<ExternalTrainingReport | null> {
  const pid = playerId.trim();
  if (!pid) return null;

  return prisma.externalTrainingReport.findFirst({
    where: { playerId: pid },
    orderBy: { createdAt: "desc" },
  });
}

/** Создать или обновить отчёт по requestId (один отчёт на запрос). */
export async function upsertExternalTrainingReportByRequest(params: {
  requestId: string;
  playerId: string;
  coachId: string;
  summary: string;
  focusAreas?: string[];
  resultNotes?: string | null;
  nextSteps?: string | null;
}): Promise<ExternalTrainingReport> {
  const rid = params.requestId.trim();
  const existing = await prisma.externalTrainingReport.findFirst({
    where: { requestId: rid },
  });

  const focusJson = (params.focusAreas ?? []) as unknown as Prisma.InputJsonValue;

  if (existing) {
    return prisma.externalTrainingReport.update({
      where: { id: existing.id },
      data: {
        summary: params.summary.trim(),
        focusAreas: focusJson,
        resultNotes: params.resultNotes?.trim() ?? null,
        nextSteps: params.nextSteps?.trim() ?? null,
      },
    });
  }

  return createExternalTrainingReport({
    requestId: rid,
    playerId: params.playerId.trim(),
    coachId: params.coachId.trim(),
    summary: params.summary,
    focusAreas: params.focusAreas ?? [],
    resultNotes: params.resultNotes,
    nextSteps: params.nextSteps,
  });
}
