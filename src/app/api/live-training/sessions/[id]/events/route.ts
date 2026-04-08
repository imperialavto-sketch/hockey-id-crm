/**
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * GET/POST /api/live-training/sessions/[id]/events — события живой тренировки.
 * POST: только status === live; создаётся event + observation draft (pipeline).
 */

import { NextRequest, NextResponse } from "next/server";
import type { LiveTrainingEventSourceType, LiveTrainingObservationSentiment } from "@prisma/client";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  ingestLiveTrainingEventForCoach,
  listLiveTrainingEventsForCoach,
  LiveTrainingHttpError,
} from "@/lib/live-training/service";

const SOURCE_TYPES: LiveTrainingEventSourceType[] = [
  "manual_stub",
  "transcript_segment",
  "system",
];

const SENTIMENTS: LiveTrainingObservationSentiment[] = ["positive", "negative", "neutral"];

function handleError(e: unknown): NextResponse {
  if (e instanceof LiveTrainingHttpError) {
    return NextResponse.json(
      { error: e.message, ...(e.body ?? {}) },
      { status: e.statusCode }
    );
  }
  console.error("live-training events route failed:", e);
  return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Некорректный идентификатор" }, { status: 400 });
  }

  try {
    const events = await listLiveTrainingEventsForCoach(user!, id.trim());
    return NextResponse.json(events);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Некорректный идентификатор" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const rawText = typeof body.rawText === "string" ? body.rawText : "";
    const playerId = typeof body.playerId === "string" ? body.playerId.trim() : undefined;
    const playerNameRaw =
      typeof body.playerNameRaw === "string" ? body.playerNameRaw : undefined;
    const eventType = typeof body.eventType === "string" ? body.eventType : undefined;
    const category = typeof body.category === "string" ? body.category : undefined;

    let sentiment: LiveTrainingObservationSentiment | undefined;
    if (typeof body.sentiment === "string" && SENTIMENTS.includes(body.sentiment as LiveTrainingObservationSentiment)) {
      sentiment = body.sentiment as LiveTrainingObservationSentiment;
    }

    let confidence: number | null | undefined;
    if (body.confidence === null) confidence = null;
    else if (typeof body.confidence === "number" && Number.isFinite(body.confidence)) {
      confidence = body.confidence;
    }

    let sourceType: LiveTrainingEventSourceType | undefined;
    if (
      typeof body.sourceType === "string" &&
      SOURCE_TYPES.includes(body.sourceType as LiveTrainingEventSourceType)
    ) {
      sourceType = body.sourceType as LiveTrainingEventSourceType;
    }

    const clientMutationId =
      typeof body.clientMutationId === "string" && body.clientMutationId.trim()
        ? body.clientMutationId.trim()
        : undefined;

    const result = await ingestLiveTrainingEventForCoach(user!, id.trim(), {
      rawText,
      playerId: playerId || undefined,
      playerNameRaw: playerNameRaw || undefined,
      eventType,
      category,
      sentiment,
      confidence,
      sourceType,
      clientMutationId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
