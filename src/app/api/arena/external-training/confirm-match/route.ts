/**
 * PHASE 2 API LOCK — NON_CORE_EXTERNAL_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `apiContours.ts`).
 * PHASE 1: `NON_CORE_EXTERNAL_CONTOUR` — docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md (match store = demo/in-memory).
 * ❗ NOT CORE SCHOOL SSOT — подтверждение follow-up внешнего контура + старт in-memory демо-match (mock).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { getParentPlayerById } from "@/lib/parent-players";
import { buildExternalFollowUpRecommendation } from "@/lib/arena/build-external-follow-up-recommendation";
import { buildFollowUpExternalRequestInput } from "@/lib/arena/build-follow-up-external-request-input";
import {
  createExternalTrainingRequest,
  getLatestExternalTrainingRequestForParentPlayer,
} from "@/lib/arena/external-training-requests";
import { getExternalTrainingReportByRequestId } from "@/lib/arena/external-training-reports";
import { buildExternalTrainingRequestView } from "@/lib/arena/build-external-training-request-view";
import {
  ArenaMatchConflictError,
  createArenaMatchAfterParentConfirm,
  getActiveArenaMatch,
  getArenaAutonomousMatchView,
} from "@/lib/arena/arena-external-training-match-store";

export async function POST(request: NextRequest) {
  const user = await getAuthFromRequest(request);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return unauthorizedResponse("Необходима авторизация родителя");
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const playerId = typeof o.playerId === "string" ? o.playerId.trim() : "";
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const parentId = user.parentId;
  const player = await getParentPlayerById(parentId, playerId);
  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  const active = getActiveArenaMatch(playerId, parentId);
  if (active && active.status !== "completed") {
    return NextResponse.json(
      { error: "Уже есть активный цикл Арены по этому игроку" },
      { status: 409 }
    );
  }

  const latestActive = await getLatestExternalTrainingRequestForParentPlayer({
    parentId,
    playerId,
  });
  if (latestActive) {
    const reportOnLatest = await getExternalTrainingReportByRequestId(latestActive.id);
    if (!reportOnLatest) {
      return NextResponse.json(
        { error: "Сначала дождитесь отчёта по текущему запросу" },
        { status: 400 }
      );
    }
  }

  const recommendation = await buildExternalFollowUpRecommendation({
    playerId,
    parentId,
  });
  if (recommendation?.type !== "follow_up_training" || !recommendation.trainerCandidate) {
    return NextResponse.json(
      {
        error:
          "Нет активного предложения внешнего контура для подтверждения (follow-up / кандидат тренера)",
      },
      { status: 400 }
    );
  }

  const input = await buildFollowUpExternalRequestInput({ playerId, parentId });
  if (!input) {
    return NextResponse.json(
      { error: "Не удалось собрать данные для согласования" },
      { status: 400 }
    );
  }

  if (input.coachId !== recommendation.trainerCandidate.coachId) {
    return NextResponse.json({ error: "Данные тренера не совпадают с предложением" }, { status: 400 });
  }

  try {
    const created = await createExternalTrainingRequest({
      playerId: input.playerId,
      parentId: input.parentId,
      coachId: input.coachId,
      skillKey: input.skillKey,
      reasonSummary: input.reasonSummary,
    });

    createArenaMatchAfterParentConfirm({
      playerId,
      parentId,
      coachId: input.coachId,
      skillKey: input.skillKey,
      focusText: input.reasonSummary,
      externalRequestId: created.id,
    });

    const matchView = getArenaAutonomousMatchView(playerId, parentId);

    return NextResponse.json({
      request: buildExternalTrainingRequestView(created),
      match: matchView,
    });
  } catch (e) {
    if (e instanceof ArenaMatchConflictError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error("POST /api/arena/external-training/confirm-match failed:", e);
    return NextResponse.json({ error: "Не удалось согласовать тренировку" }, { status: 500 });
  }
}
