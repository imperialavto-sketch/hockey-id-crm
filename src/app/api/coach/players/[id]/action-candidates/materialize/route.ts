/**
 * POST /api/coach/players/[id]/action-candidates/materialize — PHASE 16
 * Body: { candidateId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";
import { materializePlayerLiveTrainingActionCandidate } from "@/lib/live-training/materialize-live-training-action-candidate";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }
  const playerId = id.trim();

  const accessibleIds = await getAccessiblePlayerIds(user!, prisma);
  if (accessibleIds !== null && !accessibleIds.includes(playerId)) {
    return NextResponse.json({ error: "Нет доступа к игроку" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>).candidateId : undefined;
  const candidateId = typeof raw === "string" ? raw.trim() : "";
  if (!candidateId) {
    return NextResponse.json({ error: "Поле candidateId обязательно" }, { status: 400 });
  }

  if (!candidateId.startsWith(`ltac:p:${playerId}:`)) {
    return NextResponse.json(
      { error: "Кандидат не относится к этому игроку" },
      { status: 400 }
    );
  }

  try {
    const result = await materializePlayerLiveTrainingActionCandidate(user!, playerId, candidateId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      ok: true,
      alreadyExists: result.alreadyExists,
      materializedItem: result.materializedItem,
    });
  } catch (e) {
    console.error("POST .../action-candidates/materialize failed:", e);
    return NextResponse.json({ error: "Не удалось создать задачу" }, { status: 500 });
  }
}
