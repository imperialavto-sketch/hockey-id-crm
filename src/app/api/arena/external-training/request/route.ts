/**
 * PHASE 2 API LOCK — NON_CORE_EXTERNAL_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `apiContours.ts`).
 * PHASE 1: `NON_CORE_EXTERNAL_CONTOUR` — `ExternalTrainingRequest`; not school `TrainingSession`. See docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { getParentPlayerById } from "@/lib/parent-players";
import {
  createExternalTrainingRequest,
  getLatestExternalTrainingRequestForParentPlayer,
} from "@/lib/arena/external-training-requests";
import { buildExternalTrainingRequestView } from "@/lib/arena/build-external-training-request-view";

function parseIsoDate(raw: unknown): Date | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: NextRequest) {
  const user = await getAuthFromRequest(request);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const playerId = request.nextUrl.searchParams.get("playerId")?.trim();
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const player = await getParentPlayerById(user.parentId, playerId);
  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  const latest = await getLatestExternalTrainingRequestForParentPlayer({
    parentId: user.parentId,
    playerId,
  });
  return NextResponse.json(
    latest ? buildExternalTrainingRequestView(latest) : null
  );
}

export async function POST(request: NextRequest) {
  const user = await getAuthFromRequest(request);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const playerId = typeof o.playerId === "string" ? o.playerId.trim() : "";
  const coachId = typeof o.coachId === "string" ? o.coachId.trim() : "";
  if (!playerId || !coachId) {
    return NextResponse.json(
      { error: "playerId and coachId are required" },
      { status: 400 }
    );
  }

  const player = await getParentPlayerById(user.parentId, playerId);
  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  const skillKey =
    typeof o.skillKey === "string" && o.skillKey.trim() ? o.skillKey.trim() : null;
  const severity =
    typeof o.severity === "number" && Number.isFinite(o.severity)
      ? o.severity
      : null;
  const reasonSummary =
    typeof o.reasonSummary === "string" && o.reasonSummary.trim()
      ? o.reasonSummary.trim()
      : null;
  const isFallback = o.isFallback === true;
  const proposedDate = parseIsoDate(o.proposedDate);
  const proposedLocation =
    typeof o.proposedLocation === "string" && o.proposedLocation.trim()
      ? o.proposedLocation.trim()
      : null;

  try {
    const created = await createExternalTrainingRequest({
      playerId,
      parentId: user.parentId,
      coachId,
      skillKey,
      severity,
      reasonSummary,
      isFallback,
      proposedDate,
      proposedLocation,
    });
    return NextResponse.json(buildExternalTrainingRequestView(created));
  } catch (e) {
    console.error("POST /api/arena/external-training/request failed:", e);
    return NextResponse.json(
      { error: "Не удалось сохранить запрос" },
      { status: 500 }
    );
  }
}
