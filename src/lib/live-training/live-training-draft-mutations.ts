/**
 * Редактирование и мягкое удаление черновиков live training (только status === review).
 */

import type { LiveTrainingObservationSentiment, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ApiUser } from "@/lib/api-auth";
import { LiveTrainingHttpError } from "./http-error";
/** Порядок для пикеров / валидации (синхронизируйте с coach-app `liveTrainingEditableCategories`). */
export const LIVE_TRAINING_EDITABLE_CATEGORY_ORDER = [
  "praise",
  "correction",
  "attention",
  "discipline",
  "effort",
  "ofp_technique",
  "skating",
  "shooting",
  "puck_control",
  "pace",
  "general_observation",
  "общее",
] as const;

export const LIVE_TRAINING_EDITABLE_CATEGORIES = new Set<string>(
  LIVE_TRAINING_EDITABLE_CATEGORY_ORDER
);

const SENTIMENTS: LiveTrainingObservationSentiment[] = ["positive", "negative", "neutral"];

export type PatchLiveTrainingDraftBody = {
  playerId?: string | null;
  playerNameRaw?: string | null;
  sourceText?: string;
  category?: string;
  sentiment?: LiveTrainingObservationSentiment;
  needsReview?: boolean;
};

async function assertDraftEditable(
  user: ApiUser,
  sessionId: string,
  draftId: string
): Promise<{
  teamId: string;
  draft: NonNullable<Awaited<ReturnType<typeof prisma.liveTrainingObservationDraft.findFirst>>>;
}> {
  const session = await prisma.liveTrainingSession.findFirst({
    where: { id: sessionId, coachId: user.id },
    select: { id: true, status: true, teamId: true },
  });
  if (!session) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  if (session.status !== "review") {
    throw new LiveTrainingHttpError("Редактировать можно только сессию на проверке", 400);
  }

  const draft = await prisma.liveTrainingObservationDraft.findFirst({
    where: { id: draftId, sessionId, deletedAt: null },
  });
  if (!draft) {
    throw new LiveTrainingHttpError("Черновик не найден или удалён", 404);
  }

  return { teamId: session.teamId, draft };
}

async function resolvePlayerNameForTeam(
  teamId: string,
  playerId: string
): Promise<string> {
  const p = await prisma.player.findFirst({
    where: { id: playerId, teamId },
    select: { firstName: true, lastName: true },
  });
  if (!p) {
    throw new LiveTrainingHttpError("Игрок не в составе этой команды", 400);
  }
  return [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Игрок";
}

export async function patchLiveTrainingObservationDraftForCoach(
  user: ApiUser,
  sessionId: string,
  draftId: string,
  body: PatchLiveTrainingDraftBody
) {
  const { teamId, draft } = await assertDraftEditable(user, sessionId, draftId);

  const data: Prisma.LiveTrainingObservationDraftUpdateInput = {};

  if (body.sourceText !== undefined) {
    const t = typeof body.sourceText === "string" ? body.sourceText.trim() : "";
    if (!t) {
      throw new LiveTrainingHttpError("Текст наблюдения не может быть пустым", 400);
    }
    data.sourceText = t;
  }

  if (body.category !== undefined) {
    const c = typeof body.category === "string" ? body.category.trim() : "";
    if (!c || !LIVE_TRAINING_EDITABLE_CATEGORIES.has(c)) {
      throw new LiveTrainingHttpError("Некорректная категория", 400);
    }
    data.category = c;
  }

  if (body.sentiment !== undefined) {
    if (!SENTIMENTS.includes(body.sentiment)) {
      throw new LiveTrainingHttpError("Некорректная тональность", 400);
    }
    data.sentiment = body.sentiment;
  }

  if (body.needsReview !== undefined) {
    data.needsReview = Boolean(body.needsReview);
  }

  if (body.playerId !== undefined) {
    if (body.playerId === null || body.playerId === "") {
      data.Player = { disconnect: true };
      data.playerNameRaw = null;
    } else {
      const pid = String(body.playerId).trim();
      data.Player = { connect: { id: pid } };
      data.playerNameRaw = await resolvePlayerNameForTeam(teamId, pid);
    }
  } else if (body.playerNameRaw !== undefined && body.playerNameRaw !== null) {
    const raw = String(body.playerNameRaw).trim();
    data.playerNameRaw = raw || null;
  }

  if (Object.keys(data).length === 0) {
    throw new LiveTrainingHttpError("Нет полей для обновления", 400);
  }

  const updated = await prisma.liveTrainingObservationDraft.update({
    where: { id: draft.id },
    data,
  });

  return updated;
}

export async function softDeleteLiveTrainingObservationDraftForCoach(
  user: ApiUser,
  sessionId: string,
  draftId: string
): Promise<void> {
  const { draft } = await assertDraftEditable(user, sessionId, draftId);
  await prisma.liveTrainingObservationDraft.update({
    where: { id: draft.id },
    data: { deletedAt: new Date() },
  });
}

export async function loadLiveTrainingRosterForSessionTeam(teamId: string): Promise<
  Array<{ id: string; name: string }>
> {
  const players = await prisma.player.findMany({
    where: { teamId },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  return players.map((p) => ({
    id: p.id,
    name: [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Игрок",
  }));
}
