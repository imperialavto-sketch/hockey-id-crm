/**
 * PHASE 2 API LOCK — NON_CORE_EXTERNAL_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `apiContours.ts`).
 * PHASE 1: `NON_CORE_EXTERNAL_CONTOUR`. See docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md
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
  const rawPid = o.playerId;
  const playerId = typeof rawPid === "string" ? rawPid.trim() : "";
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const player = await getParentPlayerById(user.parentId, playerId);
  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  const parentId = user.parentId;

  const latestActive = await getLatestExternalTrainingRequestForParentPlayer({
    parentId,
    playerId,
  });
  if (latestActive) {
    const reportOnLatest = await getExternalTrainingReportByRequestId(latestActive.id);
    if (!reportOnLatest) {
      return NextResponse.json(buildExternalTrainingRequestView(latestActive));
    }
  }

  const recommendation = await buildExternalFollowUpRecommendation({
    playerId,
    parentId,
  });
  if (recommendation?.type !== "follow_up_training") {
    return NextResponse.json(
      { error: "Сейчас недоступно продолжение цикла по подсказке Арены" },
      { status: 400 }
    );
  }

  if (recommendation.trainerCandidate) {
    return NextResponse.json(
      {
        error:
          "Для этого шага используйте согласование с Ареной: подтвердите тренировку в блоке на экране игрока.",
      },
      { status: 400 }
    );
  }

  const input = await buildFollowUpExternalRequestInput({ playerId, parentId });
  if (!input) {
    return NextResponse.json(
      { error: "Не удалось собрать данные для следующего цикла" },
      { status: 400 }
    );
  }

  try {
    const created = await createExternalTrainingRequest({
      playerId: input.playerId,
      parentId: input.parentId,
      coachId: input.coachId,
      skillKey: input.skillKey,
      reasonSummary: input.reasonSummary,
    });
    return NextResponse.json(buildExternalTrainingRequestView(created));
  } catch (e) {
    console.error("POST /api/arena/external-training/follow-up-create failed:", e);
    return NextResponse.json(
      { error: "Не удалось создать запрос" },
      { status: 500 }
    );
  }
}
