/**
 * AI analysis persistence. Uses Prisma and ai_analyses table.
 * strengths, weaknesses, recommendations are stored as Json (string arrays).
 */

import { prisma } from "@/lib/prisma";

export interface StoredAiAnalysis {
  playerId: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  score: number | null;
  createdAt: Date;
}

function jsonToStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === "string");
  }
  return [];
}

/**
 * Returns null when table is missing or on DB error (dev-safe).
 */
export async function getLatestAiAnalysisForPlayer(
  playerId: string
): Promise<StoredAiAnalysis | null> {
  try {
    const row = await prisma.aiAnalysis.findFirst({
      where: { playerId },
      orderBy: { createdAt: "desc" },
    });
    if (!row) return null;
    return {
      playerId: row.playerId,
      summary: row.summary,
      strengths: jsonToStringArray(row.strengths),
      weaknesses: jsonToStringArray(row.weaknesses),
      recommendations: jsonToStringArray(row.recommendations),
      score: row.score,
      createdAt: row.createdAt,
    };
  } catch (err) {
    console.warn("getLatestAiAnalysisForPlayer failed (table may be missing):", err instanceof Error ? err.message : err);
    return null;
  }
}

export interface SaveAiAnalysisInput {
  playerId: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  score?: number | null;
}

export async function saveAiAnalysis(
  input: SaveAiAnalysisInput
): Promise<StoredAiAnalysis> {
  const row = await prisma.aiAnalysis.create({
    data: {
      playerId: input.playerId,
      summary: input.summary,
      strengths: input.strengths as unknown as object,
      weaknesses: input.weaknesses as unknown as object,
      recommendations: input.recommendations as unknown as object,
      score: input.score ?? null,
    },
  });
  return {
    playerId: row.playerId,
    summary: row.summary,
    strengths: jsonToStringArray(row.strengths),
    weaknesses: jsonToStringArray(row.weaknesses),
    recommendations: jsonToStringArray(row.recommendations),
    score: row.score,
    createdAt: row.createdAt,
  };
}
