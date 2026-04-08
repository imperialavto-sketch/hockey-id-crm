/**
 * PHASE 16: материализация live training candidate → ActionItem (идемпотентно).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ApiUser } from "@/lib/api-auth";
import { canAccessPlayer } from "@/lib/data-scope";
import { getCoachPlayerLiveTrainingActionCandidates } from "./build-coach-player-action-candidates";
import { listLiveTrainingSessionActionCandidatesForMaterialize } from "./session-meaning-action-candidate";
import type { LiveTrainingActionCandidateDto } from "./live-training-action-candidate-types";
import {
  getLiveTrainingSessionByIdForCoach,
  LiveTrainingHttpError,
} from "./service";

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 12000;

export type MaterializedActionItemSummary = {
  id: string;
  title: string;
  status: string;
  playerId: string | null;
  createdAt: string;
};

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function buildActionDescription(candidate: LiveTrainingActionCandidateDto): string {
  const lines = [
    candidate.body.trim(),
    "",
    [
      "Источник: live training",
      `Тип действия: ${candidate.actionType}`,
      `Сигналов в основе: ${candidate.basedOn.signalCount}`,
    ].join(" · "),
  ];
  if (candidate.basedOn.domains.length > 0) {
    lines.push(`Темы (домены): ${candidate.basedOn.domains.join(", ")}`);
  }
  if (candidate.basedOn.lastSessionAt) {
    lines.push(`Опорная дата/сессия (ISO): ${candidate.basedOn.lastSessionAt}`);
  }
  return truncate(lines.join("\n"), DESCRIPTION_MAX);
}

function toSummary(row: {
  id: string;
  title: string;
  status: string;
  playerId: string | null;
  createdAt: Date;
}): MaterializedActionItemSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    playerId: row.playerId,
    createdAt: row.createdAt.toISOString(),
  };
}

async function createOrGetActionItem(
  coachId: string,
  candidate: LiveTrainingActionCandidateDto
): Promise<{ item: MaterializedActionItemSummary; alreadyExists: boolean }> {
  const existing = await prisma.actionItem.findFirst({
    where: { coachId, liveTrainingCandidateId: candidate.id },
  });
  if (existing) {
    return { item: toSummary(existing), alreadyExists: true };
  }

  try {
    const created = await prisma.actionItem.create({
      data: {
        coachId,
        playerId: candidate.playerId,
        title: truncate(candidate.title, TITLE_MAX),
        description: buildActionDescription(candidate),
        status: "open",
        liveTrainingCandidateId: candidate.id,
      },
    });
    return { item: toSummary(created), alreadyExists: false };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await prisma.actionItem.findFirst({
        where: { coachId, liveTrainingCandidateId: candidate.id },
      });
      if (again) {
        return { item: toSummary(again), alreadyExists: true };
      }
    }
    throw e;
  }
}

export type MaterializeResult =
  | {
      ok: true;
      alreadyExists: boolean;
      materializedItem: MaterializedActionItemSummary;
    }
  | { ok: false; status: number; error: string };

export async function materializePlayerLiveTrainingActionCandidate(
  user: ApiUser,
  playerId: string,
  candidateId: string
): Promise<MaterializeResult> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { team: { select: { schoolId: true } } },
  });
  if (!player) {
    return { ok: false, status: 404, error: "Игрок не найден" };
  }
  if (!canAccessPlayer(user, player)) {
    return { ok: false, status: 403, error: "Нет доступа к игроку" };
  }

  const { items } = await getCoachPlayerLiveTrainingActionCandidates(playerId);
  const hit = items.find((i) => i.id === candidateId);
  if (!hit) {
    return {
      ok: false,
      status: 404,
      error: "Кандидат не найден или устарел — обновите список.",
    };
  }
  if (hit.playerId !== playerId) {
    return { ok: false, status: 400, error: "Несоответствие игрока и кандидата" };
  }

  const { item, alreadyExists } = await createOrGetActionItem(user.id, hit);
  return { ok: true, alreadyExists, materializedItem: item };
}

export async function materializeSessionLiveTrainingActionCandidate(
  user: ApiUser,
  sessionId: string,
  candidateId: string
): Promise<MaterializeResult> {
  let session;
  try {
    session = await getLiveTrainingSessionByIdForCoach(user, sessionId);
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return { ok: false, status: e.statusCode, error: e.message };
    }
    throw e;
  }

  if (session.status !== "confirmed" || !session.outcome) {
    return {
      ok: false,
      status: 400,
      error: "Сессия не подтверждена или нет итога для кандидатов.",
    };
  }

  if (!candidateId.startsWith(`ltac:s:${sessionId}:`)) {
    return { ok: false, status: 400, error: "Кандидат не относится к этой сессии" };
  }

  const items = listLiveTrainingSessionActionCandidatesForMaterialize(
    session.outcome,
    session.id,
    session.startedAt,
    session.sessionMeaningJson?.nextActions
  );
  const hit = items.find((i) => i.id === candidateId);
  if (!hit) {
    return {
      ok: false,
      status: 404,
      error: "Кандидат не найден или устарел — обновите список.",
    };
  }

  const { item, alreadyExists } = await createOrGetActionItem(user.id, hit);
  return { ok: true, alreadyExists, materializedItem: item };
}
