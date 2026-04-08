/**
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * GET /api/live-training/start-planning?teamId= — PHASE 17–18: фокус на старт + plan seeds (read-only).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import { canAccessTeam } from "@/lib/data-scope";
import { getNextTrainingPlanningFocus } from "@/lib/live-training/next-training-planning-focus";
import { prisma } from "@/lib/prisma";

const EMPTY_BODY = {
  teamId: "",
  focusPlayers: [],
  focusDomains: [],
  reinforceAreas: [],
  summaryLines: [],
  lowData: true,
  planSeeds: { blocks: [] as const, lowData: true },
  carryForward: null,
  coachIntelligence: {
    signals: [] as const,
    summaryLines: [] as const,
    executionPressureMode: "normal" as const,
  },
  lastSessionHandoffHints: [] as const,
  carryForwardSeed: null,
  continuitySummary: null,
} as const;

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const teamId = req.nextUrl.searchParams.get("teamId")?.trim() ?? "";
  if (!teamId) {
    return NextResponse.json(EMPTY_BODY);
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, schoolId: true },
  });
  if (!team) {
    return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
  }
  if (!canAccessTeam(user!, team)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  try {
    const dto = await getNextTrainingPlanningFocus(user!.id, teamId);
    return NextResponse.json(dto);
  } catch (e) {
    console.error("GET /api/live-training/start-planning failed:", e);
    return NextResponse.json({ error: "Не удалось загрузить фокус" }, { status: 500 });
  }
}
