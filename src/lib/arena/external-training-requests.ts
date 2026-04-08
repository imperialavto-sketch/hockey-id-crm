import { prisma } from "@/lib/prisma";

/**
 * ARCHITECTURE AUDIT PHASE 1: INTEGRITY RISK — ExternalTrainingRequest/Report have no Prisma FK to Player/Parent; app joins on string `parentId`/`playerId`.
 */

/** ⚠ MOCK MATCHING: id тренеров внешнего контура → отображаемое имя (aligned with external-training-agent). */
const ARENA_COACH_DISPLAY_NAMES: Record<string, string> = {
  coach1: "Иван Петров",
};

export function resolveArenaCoachDisplayName(coachId: string): string {
  return ARENA_COACH_DISPLAY_NAMES[coachId] ?? coachId;
}

const ACTIVE_PARENT_STATUSES = new Set(["confirmed_by_parent", "in_progress"]);

const ACTIVE_REQUEST_STATUS_LIST = ["confirmed_by_parent", "in_progress"] as const;

export type ExternalTrainingRequestRecord = {
  id: string;
  playerId: string;
  parentId: string;
  coachId: string;
  coachDisplayName: string;
  status: string;
  skillKey: string | null;
  severity: number | null;
  reasonSummary: string | null;
  isFallback: boolean;
  proposedDate: string | null;
  proposedLocation: string | null;
  createdAt: string;
  updatedAt: string;
};

function toDto(row: {
  id: string;
  playerId: string;
  parentId: string;
  coachId: string;
  status: string;
  skillKey: string | null;
  severity: number | null;
  reasonSummary: string | null;
  isFallback: boolean;
  proposedDate: Date | null;
  proposedLocation: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ExternalTrainingRequestRecord {
  return {
    id: row.id,
    playerId: row.playerId,
    parentId: row.parentId,
    coachId: row.coachId,
    coachDisplayName: resolveArenaCoachDisplayName(row.coachId),
    status: row.status,
    skillKey: row.skillKey,
    severity: row.severity,
    reasonSummary: row.reasonSummary,
    isFallback: row.isFallback,
    proposedDate: row.proposedDate?.toISOString() ?? null,
    proposedLocation: row.proposedLocation,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createExternalTrainingRequest(params: {
  playerId: string;
  parentId: string;
  coachId: string;
  skillKey?: string | null;
  severity?: number | null;
  reasonSummary?: string | null;
  isFallback?: boolean;
  proposedDate?: Date | null;
  proposedLocation?: string | null;
}): Promise<ExternalTrainingRequestRecord> {
  const row = await prisma.externalTrainingRequest.create({
    data: {
      playerId: params.playerId.trim(),
      parentId: params.parentId.trim(),
      coachId: params.coachId.trim(),
      status: "confirmed_by_parent",
      skillKey: params.skillKey?.trim() || null,
      severity: params.severity ?? null,
      reasonSummary: params.reasonSummary?.trim() || null,
      isFallback: params.isFallback ?? false,
      proposedDate: params.proposedDate ?? null,
      proposedLocation: params.proposedLocation?.trim() || null,
    },
  });
  return toDto(row);
}

export async function getLatestExternalTrainingRequestForParentPlayer(params: {
  parentId: string;
  playerId: string;
}): Promise<ExternalTrainingRequestRecord | null> {
  const parentId = params.parentId.trim();
  const playerId = params.playerId.trim();
  if (!parentId || !playerId) return null;

  const row = await prisma.externalTrainingRequest.findFirst({
    where: { parentId, playerId },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  if (!ACTIVE_PARENT_STATUSES.has(row.status)) return null;
  return toDto(row);
}

/**
 * Последний активный запрос по игроку. Для родителя передайте parentId — иначе берётся любой запрос по playerId (staff).
 */
export async function getLatestActiveExternalTrainingRequestForPlayer(params: {
  playerId: string;
  parentId?: string | null;
}): Promise<ExternalTrainingRequestRecord | null> {
  const playerId = params.playerId.trim();
  if (!playerId) return null;

  const row = await prisma.externalTrainingRequest.findFirst({
    where: {
      playerId,
      ...(params.parentId != null && String(params.parentId).trim() !== ""
        ? { parentId: String(params.parentId).trim() }
        : {}),
      status: { in: [...ACTIVE_REQUEST_STATUS_LIST] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  return toDto(row);
}

export async function setExternalTrainingRequestStatus(
  requestId: string,
  status: string
): Promise<void> {
  await prisma.externalTrainingRequest.update({
    where: { id: requestId.trim() },
    data: { status },
  });
}
