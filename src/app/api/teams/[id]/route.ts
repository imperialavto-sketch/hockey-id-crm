import { NextRequest, NextResponse } from "next/server";
import { LiveTrainingSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { findNextScheduledTrainingSlotForLiveTeam } from "@/lib/live-training/find-next-scheduled-training-slot-for-live-team";
import { listRecentArenaPlannedVsObservedLiveFactSummariesForTeam } from "@/lib/live-training/arena-planned-vs-observed-live-fact";
import { computeTeamPlannedVsObservedContinuity } from "@/lib/live-training/arena-planned-vs-observed-continuity";
import { toTeamPlannedVsObservedHistoryRowDto } from "@/lib/live-training/arena-planned-vs-observed-live-fact.dto";

const MAX_TEAM_NEXT_ACTIONS = 2;
const TEAM_PLANNED_VS_OBSERVED_LOOKBACK = 5;
const MAX_TEAM_PLAYER_FOLLOW_UP = 3;
const MAX_FOLLOW_UP_ACTIONS_PER_PLAYER = 2;

/**
 * Командный слой: до `MAX_TEAM_NEXT_ACTIONS` строк только из
 * `sessionMeaningNextActionsV1.nextTrainingFocus` и `.team` (без игроков — см. `extractTeamPlayerFollowUpFromReportDraftSummaryJson`).
 */
function extractTeamNextActionsFromReportDraftSummaryJson(summaryJson: unknown): string[] | undefined {
  if (summaryJson == null || typeof summaryJson !== "object" || Array.isArray(summaryJson)) {
    return undefined;
  }
  const na = (summaryJson as Record<string, unknown>).sessionMeaningNextActionsV1;
  if (na == null || typeof na !== "object" || Array.isArray(na)) {
    return undefined;
  }
  const rec = na as Record<string, unknown>;
  const out: string[] = [];
  const pushStrings = (arr: unknown) => {
    if (!Array.isArray(arr) || out.length >= MAX_TEAM_NEXT_ACTIONS) return;
    for (const x of arr) {
      if (out.length >= MAX_TEAM_NEXT_ACTIONS) break;
      const s = typeof x === "string" ? x.trim() : "";
      if (s) out.push(s);
    }
  };
  pushStrings(rec.nextTrainingFocus);
  if (out.length < MAX_TEAM_NEXT_ACTIONS) pushStrings(rec.team);
  return out.length > 0 ? out : undefined;
}

type TeamPlayerFollowUpRow = { playerId: string; playerName: string; actions: string[] };

/**
 * Игроки из `sessionMeaningNextActionsV1.players` с непустыми actions (после trim), до 3 игроков, до 2 строк на игрока.
 */
function extractTeamPlayerFollowUpFromReportDraftSummaryJson(
  summaryJson: unknown
): TeamPlayerFollowUpRow[] | undefined {
  if (summaryJson == null || typeof summaryJson !== "object" || Array.isArray(summaryJson)) {
    return undefined;
  }
  const na = (summaryJson as Record<string, unknown>).sessionMeaningNextActionsV1;
  if (na == null || typeof na !== "object" || Array.isArray(na)) {
    return undefined;
  }
  const players = (na as Record<string, unknown>).players;
  if (!Array.isArray(players)) {
    return undefined;
  }
  const out: TeamPlayerFollowUpRow[] = [];
  for (const p of players) {
    if (out.length >= MAX_TEAM_PLAYER_FOLLOW_UP) break;
    if (p == null || typeof p !== "object" || Array.isArray(p)) continue;
    const pr = p as Record<string, unknown>;
    const playerId = typeof pr.playerId === "string" ? pr.playerId.trim() : "";
    if (!playerId) continue;
    const playerName = typeof pr.playerName === "string" ? pr.playerName.trim() : "";
    if (!playerName) continue;
    const actions: string[] = [];
    const rawActions = pr.actions;
    if (Array.isArray(rawActions)) {
      for (const a of rawActions) {
        if (actions.length >= MAX_FOLLOW_UP_ACTIONS_PER_PLAYER) break;
        const s = typeof a === "string" ? a.trim() : "";
        if (s) actions.push(s);
      }
    }
    if (actions.length === 0) continue;
    out.push({ playerId, playerName, actions });
  }
  return out.length > 0 ? out : undefined;
}

type TeamAttentionSummary = { attentionCount: number; watchCount: number };

type TeamDevelopmentSnapshotDto = {
  headline: string;
  support?: string;
};

const MAX_TEAM_DEV_HEADLINE = 160;
const MAX_TEAM_DEV_SUPPORT = 120;

function clipTeamDevLine(s: string, max: number): string {
  const t = s.replace(/\s+/gu, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function normTeamDevKey(s: string): string {
  return s.toLowerCase().replace(/\s+/gu, " ").slice(0, 88);
}

/**
 * Командный сдвиг относительно прошлой подтверждённой live (`sessionMeaningProgressV1.team`) —
 * не next-actions и не счётчики внимания.
 */
function extractTeamDevelopmentSnapshotFromReportDraftSummaryJson(
  summaryJson: unknown,
  teamNextActions: string[] | undefined
): TeamDevelopmentSnapshotDto | undefined {
  if (summaryJson == null || typeof summaryJson !== "object" || Array.isArray(summaryJson)) {
    return undefined;
  }
  const progressRaw = (summaryJson as Record<string, unknown>).sessionMeaningProgressV1;
  if (progressRaw == null || typeof progressRaw !== "object" || Array.isArray(progressRaw)) {
    return undefined;
  }
  const teamRaw = (progressRaw as Record<string, unknown>).team;
  if (!Array.isArray(teamRaw)) return undefined;

  const nextNorm = new Set<string>();
  for (const a of teamNextActions ?? []) {
    const t = typeof a === "string" ? a.trim() : "";
    if (t) nextNorm.add(normTeamDevKey(t));
  }

  const teamLines = teamRaw
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .map((s) => clipTeamDevLine(s, MAX_TEAM_DEV_HEADLINE));

  const pickHeadline = (): string | undefined => {
    for (const line of teamLines) {
      if (!line) continue;
      if (nextNorm.has(normTeamDevKey(line))) continue;
      return line;
    }
    return undefined;
  };

  const headline = pickHeadline();
  if (!headline) return undefined;

  const hk = normTeamDevKey(headline);
  let support: string | undefined;
  for (const line of teamLines) {
    if (!line || normTeamDevKey(line) === hk) continue;
    if (nextNorm.has(normTeamDevKey(line))) continue;
    support = clipTeamDevLine(line, MAX_TEAM_DEV_SUPPORT);
    break;
  }

  return support ? { headline, support } : { headline };
}

/**
 * Уникальные playerId: сначала `attention_required` (игрок) → attention; затем progress
 * (`regressed` → attention, `no_change` → watch) без двойного счёта; `improved` не учитывается.
 */
function extractTeamAttentionSummaryFromReportDraftSummaryJson(
  summaryJson: unknown
): TeamAttentionSummary | undefined {
  if (summaryJson == null || typeof summaryJson !== "object" || Array.isArray(summaryJson)) {
    return undefined;
  }
  const root = summaryJson as Record<string, unknown>;
  const attentionIds = new Set<string>();
  const watchIds = new Set<string>();

  const triggersRaw = root.sessionMeaningActionTriggersV1;
  if (Array.isArray(triggersRaw)) {
    for (const item of triggersRaw) {
      if (item == null || typeof item !== "object" || Array.isArray(item)) continue;
      const tr = item as Record<string, unknown>;
      const type = typeof tr.type === "string" ? tr.type.trim() : "";
      const target = typeof tr.target === "string" ? tr.target.trim() : "";
      const pid = typeof tr.playerId === "string" ? tr.playerId.trim() : "";
      if (type !== "attention_required" || target !== "player" || !pid) continue;
      attentionIds.add(pid);
    }
  }

  const progressRaw = root.sessionMeaningProgressV1;
  if (progressRaw != null && typeof progressRaw === "object" && !Array.isArray(progressRaw)) {
    const progPlayers = (progressRaw as Record<string, unknown>).players;
    if (Array.isArray(progPlayers)) {
      for (const p of progPlayers) {
        if (p == null || typeof p !== "object" || Array.isArray(p)) continue;
        const pr = p as Record<string, unknown>;
        const pid = typeof pr.playerId === "string" ? pr.playerId.trim() : "";
        if (!pid || attentionIds.has(pid)) continue;
        const progress = typeof pr.progress === "string" ? pr.progress.trim() : "";
        if (progress === "regressed") {
          attentionIds.add(pid);
        } else if (progress === "no_change") {
          watchIds.add(pid);
        }
      }
    }
  }

  const attentionCount = attentionIds.size;
  const watchCount = watchIds.size;
  if (attentionCount === 0 && watchCount === 0) return undefined;
  return { attentionCount, watchCount };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { res } = await requirePermission(req, "teams", "view");
  if (res) return res;
  try {
    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        school: true,
        coach: true,
        players: {
          include: { team: true },
        },
        trainings: {
          orderBy: { startTime: "desc" },
          include: {
            attendances: { include: { player: true } },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Команда не найдена" },
        { status: 404 }
      );
    }

    /** Якорь как у coach/next-slot: привязка последней подтверждённой live к TrainingSession (см. `findNextScheduledTrainingSlotForLiveTeam`). */
    const latestConfirmedLive = await prisma.liveTrainingSession.findFirst({
      where: { teamId: id, status: LiveTrainingSessionStatus.confirmed },
      orderBy: [{ confirmedAt: "desc" }, { updatedAt: "desc" }],
      select: { id: true, trainingSessionId: true },
    });
    const linkedTrainingSessionId = latestConfirmedLive?.trainingSessionId?.trim() || null;

    const nextScheduledTrainingSession = await findNextScheduledTrainingSlotForLiveTeam({
      teamId: id,
      linkedTrainingSessionId,
    });

    let nextScheduledHasPlannedFocus = false;
    if (nextScheduledTrainingSession) {
      const slotFocus = await prisma.trainingSession.findUnique({
        where: { id: nextScheduledTrainingSession.id },
        select: { arenaNextTrainingFocus: true },
      });
      nextScheduledHasPlannedFocus = Boolean(slotFocus?.arenaNextTrainingFocus?.trim());
    }

    const latestLive = await prisma.liveTrainingSession.findFirst({
      where: { teamId: id },
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true, status: true, confirmedAt: true },
    });

    let reportDraftStatus: "draft" | "ready" | null = null;
    if (latestLive?.status === LiveTrainingSessionStatus.confirmed && latestLive.id) {
      const draftRow = await prisma.liveTrainingSessionReportDraft.findUnique({
        where: { liveTrainingSessionId: latestLive.id },
        select: { status: true },
      });
      if (draftRow?.status === "draft" || draftRow?.status === "ready") {
        reportDraftStatus = draftRow.status;
      }
    }

    let teamNextActions: string[] | undefined;
    let teamPlayerFollowUp: TeamPlayerFollowUpRow[] | undefined;
    let teamAttentionSummary: TeamAttentionSummary | undefined;
    let teamDevelopmentSnapshot: TeamDevelopmentSnapshotDto | undefined;
    const confirmedLiveId = latestConfirmedLive?.id?.trim();
    if (confirmedLiveId) {
      const draftForNextActions = await prisma.liveTrainingSessionReportDraft.findUnique({
        where: { liveTrainingSessionId: confirmedLiveId },
        select: { summaryJson: true },
      });
      const summaryJson = draftForNextActions?.summaryJson;
      teamNextActions = extractTeamNextActionsFromReportDraftSummaryJson(summaryJson);
      teamPlayerFollowUp = extractTeamPlayerFollowUpFromReportDraftSummaryJson(summaryJson);
      teamAttentionSummary = extractTeamAttentionSummaryFromReportDraftSummaryJson(summaryJson);
      teamDevelopmentSnapshot = extractTeamDevelopmentSnapshotFromReportDraftSummaryJson(
        summaryJson,
        teamNextActions
      );
    }

    const plannedVsRecent = await listRecentArenaPlannedVsObservedLiveFactSummariesForTeam(
      id,
      TEAM_PLANNED_VS_OBSERVED_LOOKBACK
    );
    const teamPlannedVsObservedSummary = plannedVsRecent[0] ?? null;
    const teamPlannedVsObservedContinuity =
      plannedVsRecent.length > 0 ? computeTeamPlannedVsObservedContinuity(plannedVsRecent) : null;
    const teamPlannedVsObservedHistory =
      plannedVsRecent.length > 1
        ? plannedVsRecent.slice(1).map((row) => toTeamPlannedVsObservedHistoryRowDto(row))
        : undefined;

    return NextResponse.json({
      ...team,
      nextScheduledTrainingSession: nextScheduledTrainingSession
        ? {
            id: nextScheduledTrainingSession.id,
            startAt: nextScheduledTrainingSession.startAt.toISOString(),
            hasPlannedFocus: nextScheduledHasPlannedFocus,
          }
        : null,
      crmLiveExecutionVisibility: {
        latestLiveSessionId: latestLive?.id ?? null,
        latestLiveStatus: latestLive?.status ?? null,
        latestLiveConfirmedAt: latestLive?.confirmedAt?.toISOString() ?? null,
        reportDraftStatus,
      },
      ...(teamNextActions && teamNextActions.length > 0 ? { teamNextActions } : {}),
      ...(teamPlayerFollowUp?.length ? { teamPlayerFollowUp } : {}),
      ...(teamAttentionSummary ? { teamAttentionSummary } : {}),
      ...(teamDevelopmentSnapshot ? { teamDevelopmentSnapshot } : {}),
      ...(teamPlannedVsObservedSummary ? { teamPlannedVsObservedSummary } : {}),
      ...(teamPlannedVsObservedHistory?.length ? { teamPlannedVsObservedHistory } : {}),
      ...(teamPlannedVsObservedContinuity ? { teamPlannedVsObservedContinuity } : {}),
    });
  } catch (error) {
    console.error("GET /api/teams/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки команды",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { res } = await requirePermission(req, "teams", "edit");
  if (res) return res;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, ageGroup, coachId } = body;

    if (coachId !== undefined && coachId) {
      const cid = String(coachId).trim();
      const coachCheck = await prisma.coach.findUnique({
        where: { id: cid },
        select: { isMarketplaceIndependent: true },
      });
      if (coachCheck?.isMarketplaceIndependent) {
        return NextResponse.json(
          {
            error:
              "Нельзя назначить независимого тренера маркетплейса на команду школы",
          },
          { status: 400 }
        );
      }
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(ageGroup && { ageGroup: String(ageGroup).trim() }),
        ...(coachId !== undefined && { coachId: coachId ? String(coachId).trim() : null }),
      },
      include: { school: true, coach: true, players: true, trainings: true },
    });
    return NextResponse.json(team);
  } catch (error) {
    console.error("PUT /api/teams/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка обновления команды" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { res } = await requirePermission(req, "teams", "delete");
  if (res) return res;
  try {
    const { id } = await params;
    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/teams/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка удаления команды" },
      { status: 500 }
    );
  }
}
