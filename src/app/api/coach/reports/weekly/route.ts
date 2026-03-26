/**
 * GET /api/coach/reports/weekly
 * Coach-scoped list of players with ready reports.
 * Auth: Bearer (requireCrmRole).
 * Data: CoachSessionParentDraft (synced from coach-app session review).
 * Fallback: [] when no drafts.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const accessibleIds = await getAccessiblePlayerIds(user!, prisma);
    const playerIdSet =
      accessibleIds === null ? null : new Set<string>(accessibleIds);

    // Sessions owned by this coach
    const sessions = await prisma.coachSession.findMany({
      where: {
        coachUserId: user!.id,
        endedAt: { not: null },
        parentDrafts: { some: {} },
      },
      include: {
        parentDrafts: true,
      },
      orderBy: { endedAt: "desc" },
      take: 50,
    });

    const seen = new Set<string>();
    const items: Array<{
      playerId: string;
      playerName: string;
      shortSummary?: string;
      keyPoints?: string[];
      updatedAt?: string;
      ready?: boolean;
    }> = [];

    for (const s of sessions) {
      for (const d of s.parentDrafts) {
        if (playerIdSet !== null && !playerIdSet.has(d.playerId)) continue;
        if (seen.has(d.playerId)) continue;
        seen.add(d.playerId);

        const positives = Array.isArray(d.positives) ? d.positives : [];
        const improvementAreas = Array.isArray(d.improvementAreas)
          ? d.improvementAreas
          : [];
        const summaryRaw =
          d.headline?.trim() ||
          d.parentMessage?.trim() ||
          positives[0] ||
          improvementAreas[0] ||
          "—";
        const summary = typeof summaryRaw === "string" ? summaryRaw : String(summaryRaw ?? "—");

        items.push({
          playerId: d.playerId,
          playerName: d.playerName || "Игрок",
          shortSummary: summary,
          keyPoints: positives.slice(0, 3).map((p) => (typeof p === "string" ? p : String(p ?? ""))),
          updatedAt: s.endedAt?.toISOString() ?? s.startedAt.toISOString(),
          ready: true,
        });
      }
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/coach/reports/weekly failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки отчётов",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
