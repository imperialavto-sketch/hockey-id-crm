/**
 * STEP 22: один отзыв на ExternalCoachRecommendation (upsert).
 */

import { prisma } from "@/lib/prisma";

const MAX_SUMMARY = 4000;
const MAX_FOCUS_ITEMS = 8;
const MAX_FOCUS_LINE = 240;

function normalizeFocusAreas(raw: string[]): string[] {
  const out: string[] = [];
  for (const x of raw) {
    if (out.length >= MAX_FOCUS_ITEMS) break;
    if (typeof x !== "string") continue;
    const t = x.trim().replace(/\s+/g, " ").slice(0, MAX_FOCUS_LINE);
    if (t) out.push(t);
  }
  return out;
}

export type ExternalCoachFeedbackRowDto = {
  id: string;
  recommendationId: string;
  summary: string;
  focusAreas: string[];
  createdAt: string;
};

function mapRow(r: {
  id: string;
  recommendationId: string;
  summary: string;
  focusAreas: string[];
  createdAt: Date;
}): ExternalCoachFeedbackRowDto {
  return {
    id: r.id,
    recommendationId: r.recommendationId,
    summary: r.summary,
    focusAreas: Array.isArray(r.focusAreas) ? r.focusAreas : [],
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getExternalCoachFeedbackByRecommendationId(
  recommendationId: string
): Promise<ExternalCoachFeedbackRowDto | null> {
  const rid = recommendationId?.trim();
  if (!rid) return null;
  const row = await prisma.externalCoachFeedback.findUnique({
    where: { recommendationId: rid },
  });
  return row ? mapRow(row) : null;
}

export async function upsertExternalCoachFeedback(params: {
  recommendationId: string;
  summary: string;
  focusAreas: string[];
}): Promise<ExternalCoachFeedbackRowDto> {
  const recommendationId = params.recommendationId?.trim();
  if (!recommendationId) {
    throw new Error("recommendationId required");
  }
  const summary = params.summary?.trim().slice(0, MAX_SUMMARY) ?? "";
  if (!summary) {
    throw new Error("summary required");
  }
  const focusAreas = normalizeFocusAreas(params.focusAreas ?? []);

  const row = await prisma.externalCoachFeedback.upsert({
    where: { recommendationId },
    create: {
      recommendationId,
      summary,
      focusAreas,
    },
    update: {
      summary,
      focusAreas,
    },
  });
  return mapRow(row);
}
