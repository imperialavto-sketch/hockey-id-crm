/**
 * Canonical published `TrainingSessionReport` history for CRM/coach reads.
 * Source: `TrainingSessionReport` + `TrainingSession` only (no draft / Arena / preview JSON).
 */

import type { ApiUser } from "./api-auth";
import { getCanonicalTrainingSessionIdFromLiveRow } from "./live-training/resolve-live-training-to-training-session";
import { prisma } from "./prisma";
import { canParentAccessPlayer } from "./parent-access";
import { canUserAccessSessionTeam } from "./training-session-helpers";

export type PublishedTrainingSessionReportHistoryItemDto = {
  trainingId: string;
  sessionStartedAt: string;
  teamName: string | null;
  sessionKindLabel: string;
  summaryPreview: string;
  focusAreasPreview: string | null;
  updatedAt: string;
  /** Present when live-training publish flow recorded it on the paired draft row. */
  publishedAt: string | null;
};

/** History row + полные поля отчёта для аналитики (тот же канонический источник). */
export type PublishedTrainingSessionReportHistoryAnalyticsRow =
  PublishedTrainingSessionReportHistoryItemDto & {
    summaryFull: string | null;
    focusAreasFull: string | null;
    coachNoteFull: string | null;
    parentMessageFull: string | null;
  };

const MAX_LIMIT = 50;
const ANALYTICS_MAX_LIMIT = 40;
const SUMMARY_PREVIEW_MAX = 160;
const FOCUS_PREVIEW_MAX = 120;

function sessionKindLabel(type: string, subType: string | null): string {
  const base = String(type).toLowerCase() === "ofp" ? "ОФП" : "Лёд";
  const sub = subType?.trim();
  return sub ? `${base} · ${sub}` : base;
}

function firstMeaningfulLine(s: string | null | undefined): string | null {
  if (!s?.trim()) return null;
  const line = s
    .split(/\r?\n/u)
    .map((x) => x.trim())
    .find((x) => x.length > 0);
  return line ?? null;
}

function truncatePreview(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function hasMeaningfulPublishedContent(row: {
  summary: string | null;
  focusAreas: string | null;
  parentMessage: string | null;
  coachNote: string | null;
}): boolean {
  return (
    !!row.summary?.trim() ||
    !!row.focusAreas?.trim() ||
    !!row.parentMessage?.trim() ||
    !!row.coachNote?.trim()
  );
}

function buildSummaryPreview(row: {
  summary: string | null;
  parentMessage: string | null;
  focusAreas: string | null;
  coachNote: string | null;
}): string {
  const fromSummary = firstMeaningfulLine(row.summary);
  if (fromSummary) return truncatePreview(fromSummary, SUMMARY_PREVIEW_MAX);
  const fromPm = firstMeaningfulLine(row.parentMessage);
  if (fromPm) return truncatePreview(fromPm, SUMMARY_PREVIEW_MAX);
  const fromFocus = firstMeaningfulLine(row.focusAreas);
  if (fromFocus) return truncatePreview(fromFocus, SUMMARY_PREVIEW_MAX);
  const fromCoach = firstMeaningfulLine(row.coachNote);
  if (fromCoach) return truncatePreview(fromCoach, SUMMARY_PREVIEW_MAX);
  return "";
}

function buildFocusAreasPreview(focusAreas: string | null): string | null {
  const line = firstMeaningfulLine(focusAreas);
  if (!line) return null;
  return truncatePreview(line, FOCUS_PREVIEW_MAX);
}

type ReportRow = {
  id: string;
  trainingId: string;
  summary: string | null;
  focusAreas: string | null;
  coachNote: string | null;
  parentMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  training: {
    id: string;
    startAt: Date;
    type: string;
    subType: string | null;
    teamId: string;
    team: { name: string; schoolId: string } | null;
  };
};

function mapRowToDto(
  row: ReportRow,
  publishedAtByTrainingId: Map<string, string>
): PublishedTrainingSessionReportHistoryItemDto {
  const t = row.training;
  const summaryPreview = buildSummaryPreview(row);
  return {
    trainingId: t.id,
    sessionStartedAt: t.startAt.toISOString(),
    teamName: t.team?.name?.trim() || null,
    sessionKindLabel: sessionKindLabel(t.type, t.subType),
    summaryPreview,
    focusAreasPreview: buildFocusAreasPreview(row.focusAreas),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: publishedAtByTrainingId.get(t.id) ?? null,
  };
}

function mapRowToAnalyticsRow(
  row: ReportRow,
  publishedAtByTrainingId: Map<string, string>
): PublishedTrainingSessionReportHistoryAnalyticsRow {
  const base = mapRowToDto(row, publishedAtByTrainingId);
  return {
    ...base,
    summaryFull: row.summary?.trim() || null,
    focusAreasFull: row.focusAreas?.trim() || null,
    coachNoteFull: row.coachNote?.trim() || null,
    parentMessageFull: row.parentMessage?.trim() || null,
  };
}

/**
 * Best-effort: map `trainingId` → ISO `publishedAt` from live-training drafts that
 * published into `TrainingSessionReport` (status ready, `publishedAt` set).
 * Scoped to the given training ids to keep work bounded.
 */
async function loadPublishedAtByTrainingId(
  trainingIds: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (trainingIds.length === 0) return out;

  const drafts = await prisma.liveTrainingSessionReportDraft.findMany({
    where: {
      status: "ready",
      publishedAt: { not: null },
    },
    select: {
      publishedAt: true,
      LiveTrainingSession: {
        select: { trainingSessionId: true, planningSnapshotJson: true },
      },
    },
    take: 400,
  });

  const want = new Set(trainingIds);
  const best = new Map<string, Date>();

  for (const d of drafts) {
    const tid =
      getCanonicalTrainingSessionIdFromLiveRow({
        trainingSessionId: d.LiveTrainingSession.trainingSessionId,
        planningSnapshotJson: d.LiveTrainingSession.planningSnapshotJson,
      }) ?? "";
    if (!tid || !want.has(tid) || !d.publishedAt) continue;
    const prev = best.get(tid);
    if (!prev || d.publishedAt > prev) {
      best.set(tid, d.publishedAt);
    }
  }

  for (const [tid, dt] of best) {
    out.set(tid, dt.toISOString());
  }
  return out;
}

function resolveLimit(n?: number): number {
  if (n === undefined || !Number.isFinite(n) || n <= 0) return 20;
  return Math.min(Math.max(1, Math.floor(n)), MAX_LIMIT);
}

function resolveAnalyticsLimit(n?: number): number {
  if (n === undefined || !Number.isFinite(n) || n <= 0) return ANALYTICS_MAX_LIMIT;
  return Math.min(Math.max(1, Math.floor(n)), ANALYTICS_MAX_LIMIT);
}

/**
 * Published session reports for trainings the player attended, newest session first.
 * Respects `canUserAccessSessionTeam` per row (historical attendances on other teams are dropped).
 */
export async function listCoachPublishedTrainingSessionReportHistoryForPlayer(
  user: ApiUser,
  playerId: string,
  options?: { limit?: number }
): Promise<PublishedTrainingSessionReportHistoryItemDto[]> {
  const cap = resolveLimit(options?.limit);
  const fetchSize = Math.min(Math.max(cap * 4, cap), 120);

  const rows = await prisma.trainingSessionReport.findMany({
    where: {
      training: {
        trainingAttendances: { some: { playerId } },
      },
    },
    include: {
      training: {
        include: {
          team: { select: { name: true, schoolId: true } },
        },
      },
    },
    orderBy: {
      training: { startAt: "desc" },
    },
    take: fetchSize,
  });

  const filtered: ReportRow[] = [];
  for (const row of rows) {
    if (!hasMeaningfulPublishedContent(row)) continue;
    if (!canUserAccessSessionTeam(user, row.training)) continue;
    filtered.push(row as ReportRow);
    if (filtered.length >= cap) break;
  }

  const trainingIds = filtered.map((r) => r.training.id);
  const publishedAtByTrainingId = await loadPublishedAtByTrainingId(trainingIds);

  return filtered.map((r) => mapRowToDto(r, publishedAtByTrainingId));
}

/**
 * То же отбора отчётов, что и список истории, но с полным текстом полей для эвристической аналитики.
 */
export async function listCoachPublishedTrainingSessionReportAnalyticsInputForPlayer(
  user: ApiUser,
  playerId: string,
  options?: { limit?: number }
): Promise<PublishedTrainingSessionReportHistoryAnalyticsRow[]> {
  const cap = resolveAnalyticsLimit(options?.limit);
  const fetchSize = Math.min(Math.max(cap * 4, cap), 120);

  const rows = await prisma.trainingSessionReport.findMany({
    where: {
      training: {
        trainingAttendances: { some: { playerId } },
      },
    },
    include: {
      training: {
        include: {
          team: { select: { name: true, schoolId: true } },
        },
      },
    },
    orderBy: {
      training: { startAt: "desc" },
    },
    take: fetchSize,
  });

  const filtered: ReportRow[] = [];
  for (const row of rows) {
    if (!hasMeaningfulPublishedContent(row)) continue;
    if (!canUserAccessSessionTeam(user, row.training)) continue;
    filtered.push(row as ReportRow);
    if (filtered.length >= cap) break;
  }

  const trainingIds = filtered.map((r) => r.training.id);
  const publishedAtByTrainingId = await loadPublishedAtByTrainingId(trainingIds);

  return filtered.map((r) => mapRowToAnalyticsRow(r, publishedAtByTrainingId));
}

/**
 * Как `listCoachPublishedTrainingSessionReportAnalyticsInputForPlayer`, но для родителя:
 * только игроки, к которым у parentId есть доступ; без фильтра `canUserAccessSessionTeam`.
 */
export async function listParentPublishedTrainingSessionReportAnalyticsInputForPlayer(
  parentId: string,
  playerId: string,
  options?: { limit?: number }
): Promise<PublishedTrainingSessionReportHistoryAnalyticsRow[]> {
  const pid = String(parentId ?? "").trim();
  const plid = String(playerId ?? "").trim();
  if (!pid || !plid) return [];

  const allowed = await canParentAccessPlayer(pid, plid);
  if (!allowed) return [];

  const cap = resolveAnalyticsLimit(options?.limit);
  const fetchSize = Math.min(Math.max(cap * 4, cap), 120);

  const rows = await prisma.trainingSessionReport.findMany({
    where: {
      training: {
        trainingAttendances: { some: { playerId: plid } },
      },
    },
    include: {
      training: {
        include: {
          team: { select: { name: true, schoolId: true } },
        },
      },
    },
    orderBy: {
      training: { startAt: "desc" },
    },
    take: fetchSize,
  });

  const filtered: ReportRow[] = [];
  for (const row of rows) {
    if (!hasMeaningfulPublishedContent(row)) continue;
    filtered.push(row as ReportRow);
    if (filtered.length >= cap) break;
  }

  const trainingIds = filtered.map((r) => r.training.id);
  const publishedAtByTrainingId = await loadPublishedAtByTrainingId(trainingIds);

  return filtered.map((r) => mapRowToAnalyticsRow(r, publishedAtByTrainingId));
}
