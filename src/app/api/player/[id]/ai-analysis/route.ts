/**
 * GET /api/player/[id]/ai-analysis
 * Returns normalized AI analysis for the player.
 * Reads player from PostgreSQL, latest player_stats, latest ai_analyses from DB.
 * If ai_analyses record exists, returns it with basedOn.previousAnalysis = true.
 * If not, generates via generatePlayerAnalysis, saves to AiAnalysis, then returns.
 * Auth: CRM (session/cookie) or Parent (Bearer token).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";
import { canParentAccessPlayer } from "@/lib/parent-access";
import { generatePlayerAnalysis } from "@/lib/ai/player-analysis";
import {
  getLatestAiAnalysisForPlayer,
  saveAiAnalysis,
} from "@/lib/ai/ai-analysis-store";

export interface AiAnalysisResponse {
  playerId: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  score: number | null;
  basedOn: {
    player: boolean;
    stats: boolean;
    previousAnalysis: boolean;
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "ID игрока обязателен" },
      { status: 400 }
    );
  }

  const user = await getAuthFromRequest(req);

  if (!user) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      team: true,
      stats: { orderBy: { season: "desc" }, take: 1 },
      attendances: { select: { status: true } },
      coachRatings: {
        where: { OR: [{ recommendation: { not: null } }, { comment: { not: null } }] },
        select: { recommendation: true, comment: true },
      },
      notes: { orderBy: { createdAt: "desc" }, take: 10, select: { note: true } },
      skills: true,
      progressSnapshots: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  if (user.role === "PARENT" && user.parentId) {
    const canAccess = await canParentAccessPlayer(user.parentId, player.id);
    if (!canAccess) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }
  } else {
    const { res } = await requirePermission(req, "players", "view");
    if (res) return res;
    const accessRes = checkPlayerAccess(user, {
      ...player,
      team: player.team ?? undefined,
    });
    if (accessRes) return accessRes;
  }

  try {
    const latestStat = player.stats[0]
      ? {
          season: player.stats[0].season,
          games: player.stats[0].games,
          goals: player.stats[0].goals,
          assists: player.stats[0].assists,
          points: player.stats[0].points,
          pim: player.stats[0].pim,
        }
      : null;

    const previousAnalysis = await getLatestAiAnalysisForPlayer(id);

    let response: AiAnalysisResponse;

    if (previousAnalysis) {
      response = {
        playerId: id,
        summary: previousAnalysis.summary,
        strengths: previousAnalysis.strengths ?? [],
        weaknesses: previousAnalysis.weaknesses ?? [],
        recommendations: previousAnalysis.recommendations ?? [],
        score: previousAnalysis.score,
        basedOn: {
          player: true,
          stats: true,
          previousAnalysis: true,
        },
      };
    } else {
      const progressHistory = (player.progressSnapshots ?? []).map((s) => ({
        month: s.month,
        year: s.year,
        games: s.games,
        goals: s.goals,
        assists: s.assists,
        points: s.points,
        attendancePercent: s.attendancePercent ?? undefined,
        coachComment: s.coachComment ?? undefined,
        focusArea: s.focusArea ?? undefined,
        trend: s.trend ?? undefined,
      }));

      const analysis = await generatePlayerAnalysis({
        player: {
          firstName: player.firstName,
          lastName: player.lastName,
          birthYear: player.birthYear,
          position: player.position,
          team: player.team,
        },
        latestStat,
        attendances: player.attendances,
        coachRatings: player.coachRatings,
        notes: player.notes,
        skills: player.skills ?? undefined,
        progressHistory,
      });

      try {
        await saveAiAnalysis({
          playerId: id,
          summary: analysis.summary,
          strengths: analysis.strengths ?? [],
          weaknesses: analysis.growthAreas ?? [],
          recommendations: analysis.recommendations ?? [],
          score: null,
        });
      } catch (saveErr) {
        console.warn("saveAiAnalysis failed (table may be missing), returning without persist:", saveErr instanceof Error ? saveErr.message : saveErr);
      }

      response = {
        playerId: id,
        summary: analysis.summary,
        strengths: analysis.strengths ?? [],
        weaknesses: analysis.growthAreas ?? [],
        recommendations: analysis.recommendations ?? [],
        score: null,
        basedOn: {
          player: true,
          stats: latestStat !== null,
          previousAnalysis: false,
        },
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/player/[id]/ai-analysis failed:", error);
    return NextResponse.json(
      { error: "Ошибка формирования анализа" },
      { status: 500 }
    );
  }
}
