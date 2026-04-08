/**
 * PHASE 2 API LOCK — CANONICAL_SCHOOL_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * Hockey ID structured foundation (`PlayerSessionStructuredMetrics`). Рядом с quick evaluations, не замена.
 * Пересечения по смыслу: `evaluation-structured-alignment.ts`.
 */
import { NextRequest, NextResponse } from "next/server";
import { StatsSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { canUserAccessSessionTeam } from "@/lib/training-session-helpers";
import { getPlayersForTrainingSession } from "@/lib/training-session-attendance";
import { mergeAxisBucket } from "@/lib/coach-session-metrics/merge-axis-buckets";
import {
  parsePlayerSessionStructuredMetricsMergePayload,
  type ParsedPlayerSessionStructuredMetricsMerge,
} from "@/lib/coach-session-metrics/validate";
import { upsertPlayerSessionStructuredMetrics } from "@/lib/coach-session-metrics/repository";

function rowToDto(row: {
  schemaVersion: number;
  source: StatsSource;
  iceTechnical: unknown;
  tactical: unknown;
  ofpQualitative: unknown;
  physical: unknown;
  behavioral: unknown;
  observation: unknown;
  voiceMeta: unknown;
}) {
  return {
    schemaVersion: row.schemaVersion,
    source: row.source,
    iceTechnical: row.iceTechnical,
    tactical: row.tactical,
    ofpQualitative: row.ofpQualitative,
    physical: row.physical,
    behavioral: row.behavioral,
    observation: row.observation,
    voiceMeta: row.voiceMeta,
  };
}

function buildMergedUpsertPatch(
  existing: {
    iceTechnical: unknown;
    tactical: unknown;
    ofpQualitative: unknown;
    physical: unknown;
    behavioral: unknown;
    observation: unknown;
    voiceMeta: unknown;
  } | null,
  parsed: ParsedPlayerSessionStructuredMetricsMerge
): ParsedPlayerSessionStructuredMetricsMerge {
  const out: ParsedPlayerSessionStructuredMetricsMerge = {};
  if (parsed.schemaVersion !== undefined) {
    out.schemaVersion = parsed.schemaVersion;
  }
  if (parsed.iceTechnical !== undefined) {
    const m = mergeAxisBucket(existing?.iceTechnical, parsed.iceTechnical);
    if (m !== undefined) out.iceTechnical = m;
  }
  if (parsed.tactical !== undefined) {
    const m = mergeAxisBucket(existing?.tactical, parsed.tactical);
    if (m !== undefined) out.tactical = m;
  }
  if (parsed.ofpQualitative !== undefined) {
    const m = mergeAxisBucket(existing?.ofpQualitative, parsed.ofpQualitative);
    if (m !== undefined) out.ofpQualitative = m;
  }
  if (parsed.physical !== undefined) {
    const m = mergeAxisBucket(existing?.physical, parsed.physical);
    if (m !== undefined) out.physical = m;
  }
  if (parsed.behavioral !== undefined) {
    const m = mergeAxisBucket(existing?.behavioral, parsed.behavioral);
    if (m !== undefined) out.behavioral = m;
  }
  if (parsed.observation !== undefined) {
    out.observation = parsed.observation;
  }
  if (parsed.voiceMeta !== undefined) {
    out.voiceMeta = parsed.voiceMeta;
  }
  return out;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(_req, "trainings", "view");
  if (res) return res;

  try {
    const { id } = await params;
    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: { team: { select: { schoolId: true } } },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Тренировка не найдена" },
        { status: 404 }
      );
    }

    if (!canUserAccessSessionTeam(user!, session)) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const groupPlayers = await getPlayersForTrainingSession({
      teamId: session.teamId,
      groupId: session.groupId,
      startAt: session.startAt,
    });

    const rows = await prisma.playerSessionStructuredMetrics.findMany({
      where: { trainingSessionId: id },
    });
    const byPlayer = new Map(rows.map((r) => [r.playerId, r]));

    const players = groupPlayers.map((p) => {
      const row = byPlayer.get(p.playerId);
      const name = `${p.firstName} ${p.lastName}`.trim() || "Игрок";
      return {
        playerId: p.playerId,
        name,
        structuredMetrics: row ? rowToDto(row) : null,
      };
    });

    return NextResponse.json({
      trainingSessionId: id,
      players,
    });
  } catch (error) {
    console.error("GET /api/trainings/[id]/structured-metrics failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки метрик" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;

  try {
    const { id: trainingId } = await params;
    const session = await prisma.trainingSession.findUnique({
      where: { id: trainingId },
      include: { team: { select: { schoolId: true } } },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Тренировка не найдена" },
        { status: 404 }
      );
    }

    if (!canUserAccessSessionTeam(user!, session)) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Некорректное тело запроса" },
        { status: 400 }
      );
    }

    const itemsRaw = body.items;
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      return NextResponse.json(
        { error: "Ожидается непустой массив items" },
        { status: 400 }
      );
    }

    const groupPlayers = await getPlayersForTrainingSession({
      teamId: session.teamId,
      groupId: session.groupId,
      startAt: session.startAt,
    });
    const rosterIds = new Set(groupPlayers.map((p) => p.playerId));

    const existingRows = await prisma.playerSessionStructuredMetrics.findMany({
      where: { trainingSessionId: trainingId },
    });
    const existingByPlayer = new Map(
      existingRows.map((r) => [r.playerId, r])
    );

    let updated = 0;

    for (let i = 0; i < itemsRaw.length; i++) {
      const item = itemsRaw[i];
      if (!item || typeof item !== "object") {
        return NextResponse.json(
          { error: `items[${i}]: ожидается объект` },
          { status: 400 }
        );
      }
      const rec = item as Record<string, unknown>;
      const playerIdRaw = rec.playerId;
      if (typeof playerIdRaw !== "string" || !playerIdRaw.trim()) {
        return NextResponse.json(
          { error: `items[${i}]: обязательно поле playerId` },
          { status: 400 }
        );
      }
      const playerId = playerIdRaw.trim();
      if (!rosterIds.has(playerId)) {
        return NextResponse.json(
          {
            error: `Игрок ${playerId} не в группе на эту неделю для данной тренировки`,
          },
          { status: 403 }
        );
      }

      const { playerId: _omit, ...rest } = rec;
      void _omit;

      let parsed: ParsedPlayerSessionStructuredMetricsMerge;
      try {
        parsed = parsePlayerSessionStructuredMetricsMergePayload(rest);
      } catch (e) {
        return NextResponse.json(
          {
            error:
              e instanceof Error
                ? `items[${i}]: ${e.message}`
                : `items[${i}]: неверные данные`,
          },
          { status: 400 }
        );
      }

      const keysTouched = Object.keys(parsed).length;
      if (keysTouched === 0) {
        continue;
      }

      const prev = existingByPlayer.get(playerId) ?? null;
      const merged = buildMergedUpsertPatch(prev, parsed);

      await upsertPlayerSessionStructuredMetrics(
        trainingId,
        playerId,
        StatsSource.MANUAL,
        merged
      );
      updated += 1;

      const after = await prisma.playerSessionStructuredMetrics.findUnique({
        where: {
          trainingSessionId_playerId: {
            trainingSessionId: trainingId,
            playerId,
          },
        },
      });
      if (after) {
        existingByPlayer.set(playerId, after);
      }
    }

    return NextResponse.json({ ok: true as const, updated });
  } catch (error) {
    console.error("PATCH /api/trainings/[id]/structured-metrics failed:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения метрик" },
      { status: 500 }
    );
  }
}
