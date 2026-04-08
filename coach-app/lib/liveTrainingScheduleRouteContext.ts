/**
 * Контекст слота CRM: основной источник — planningSnapshot.scheduleSlotContext на сервере;
 * query-параметры lt* остаются fallback для старых сессий и внешних ссылок.
 */

import type { Href } from "expo-router";
import type { ArenaScheduleSlotContext } from "@/lib/arenaAssistantBehavior";
import { normalizeScheduleKind } from "@/lib/scheduleSlotForm";
import type { CoachTrainingSession } from "@/services/coachScheduleService";
import { getActiveLiveTrainingSession } from "@/services/liveTrainingService";
import type {
  LiveTrainingMode,
  LiveTrainingPlanningSnapshot,
  LiveTrainingSession,
} from "@/types/liveTraining";

export type LiveTrainingScheduleRouteContext = {
  /** ID тренировки в расписании (TrainingSession), не live-training session */
  trainingSlotId: string;
  groupId: string | null;
  groupName: string | null;
  slotStartAt: string;
  slotEndAt: string;
  /** ice/ofp — слот CRM; mixed — режим живой тренировки (в Арене подпись берётся из режима сессии). */
  scheduleKind: "ice" | "ofp" | "mixed";
};

const K = {
  slot: "ltSlot",
  gid: "ltGid",
  gnm: "ltGnm",
  s0: "ltS0",
  s1: "ltS1",
  sk: "ltSk",
} as const;

function one(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export function coachScheduleSessionToRouteContext(
  s: CoachTrainingSession
): LiveTrainingScheduleRouteContext {
  return {
    trainingSlotId: s.id,
    groupId: s.groupId ?? null,
    groupName: s.groupName?.trim() ? s.groupName.trim() : null,
    slotStartAt: s.startAt,
    slotEndAt: s.endAt,
    scheduleKind: normalizeScheduleKind(s.type),
  };
}

export function serializeScheduleRouteContext(
  ctx: LiveTrainingScheduleRouteContext
): string {
  const q = new URLSearchParams();
  q.set(K.slot, ctx.trainingSlotId);
  q.set(K.gid, ctx.groupId ?? "");
  q.set(K.gnm, ctx.groupName ?? "");
  q.set(K.s0, ctx.slotStartAt);
  q.set(K.s1, ctx.slotEndAt);
  q.set(K.sk, ctx.scheduleKind);
  return q.toString();
}

/** Суффикс для href: `?ltSlot=...` или пустая строка (без слота расписания query не кодируем). */
export function scheduleRouteQuerySuffix(
  ctx: LiveTrainingScheduleRouteContext | null
): string {
  if (!ctx) return "";
  const slot = ctx.trainingSlotId?.trim() ?? "";
  if (!slot) return "";
  const s = serializeScheduleRouteContext(ctx);
  return s ? `?${s}` : "";
}

/** PHASE 6 Step 10: показать блок «Как сформирован отчёт» на экране report-draft после авто-finalize. */
export function withLtArenaAutoQuery(scheduleSuffix: string): string {
  if (!scheduleSuffix) return "?ltArenaAuto=1";
  return `${scheduleSuffix}&ltArenaAuto=1`;
}

function parseTrainingTypeToScheduleKind(
  raw: string | null | undefined
): LiveTrainingScheduleRouteContext["scheduleKind"] {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "ofp") return "ofp";
  if (t === "mixed") return "mixed";
  return "ice";
}

function planningSnapshotToRouteContext(
  snap: LiveTrainingPlanningSnapshot | undefined,
  sessionTeamId: string
): LiveTrainingScheduleRouteContext | null {
  const block = snap?.scheduleSlotContext;
  if (!block || block.teamId !== sessionTeamId) return null;
  return {
    trainingSlotId: (block.trainingSlotId ?? "").trim(),
    groupId: block.groupId ?? null,
    groupName: block.groupName?.trim() ? block.groupName.trim() : null,
    slotStartAt: block.scheduledAt?.trim() ?? "",
    slotEndAt: block.scheduledEndAt?.trim() ?? "",
    scheduleKind: parseTrainingTypeToScheduleKind(block.trainingType ?? null),
  };
}

/**
 * Контекст слота: сначала из сессии (planningSnapshot.scheduleSlotContext), иначе из query URL.
 */
export function resolveLiveTrainingScheduleRouteContext(
  session: LiveTrainingSession | null | undefined,
  routeParams: Record<string, string | string[] | undefined>
): LiveTrainingScheduleRouteContext | null {
  const fromSession =
    session &&
    planningSnapshotToRouteContext(session.planningSnapshot, session.teamId);
  if (fromSession) return fromSession;
  return parseScheduleRouteContext(routeParams);
}

/** Тело POST /sessions.scheduleSlotContext при старте с экрана. */
/** Нужен для publish в CRM: слот в snapshot или колонка `trainingSessionId` на сервере. */
export function hasCrmSlotLinkageForPublish(
  session: LiveTrainingSession | null | undefined
): boolean {
  if (!session) return false;
  const fromSnap = session.planningSnapshot?.scheduleSlotContext?.trainingSlotId?.trim();
  if (fromSnap) return true;
  const fk =
    typeof session.trainingSessionId === "string" ? session.trainingSessionId.trim() : "";
  return fk.length > 0;
}

export function buildScheduleSlotContextForSessionStart(input: {
  teamId: string;
  routeCtx: LiveTrainingScheduleRouteContext | null;
  liveMode: LiveTrainingMode;
}): Record<string, unknown> {
  const route = input.routeCtx;
  const scheduleKind = route
    ? route.scheduleKind
    : input.liveMode === "ofp"
      ? "ofp"
      : input.liveMode === "mixed"
        ? "mixed"
        : "ice";
  const payload: Record<string, unknown> = {
    teamId: input.teamId,
    groupId: route?.groupId ?? null,
  };
  if (route?.groupName?.trim()) {
    payload.groupName = route.groupName.trim();
  }
  const slotId = route?.trainingSlotId?.trim();
  if (slotId) {
    payload.trainingSlotId = slotId;
  }
  payload.trainingType = scheduleKind;
  const s0 = route?.slotStartAt?.trim();
  const s1 = route?.slotEndAt?.trim();
  if (s0) payload.scheduledAt = s0;
  if (s1) payload.scheduledEndAt = s1;
  return payload;
}

export function parseScheduleRouteContext(
  params: Record<string, string | string[] | undefined>
): LiveTrainingScheduleRouteContext | null {
  const slot = one(params[K.slot])?.trim();
  if (!slot) return null;
  const gidRaw = one(params[K.gid])?.trim() ?? "";
  const groupId = gidRaw.length > 0 ? gidRaw : null;
  let groupName: string | null = null;
  const gnmRaw = one(params[K.gnm]);
  if (gnmRaw && gnmRaw.trim()) {
    try {
      groupName = decodeURIComponent(gnmRaw.trim());
    } catch {
      groupName = gnmRaw.trim();
    }
  }
  const s0 = one(params[K.s0])?.trim() ?? "";
  const s1 = one(params[K.s1])?.trim() ?? "";
  const skRaw = one(params[K.sk])?.trim().toLowerCase();
  const scheduleKind =
    skRaw === "ofp" ? "ofp" : skRaw === "mixed" ? "mixed" : "ice";
  return {
    trainingSlotId: slot,
    groupId,
    groupName,
    slotStartAt: s0,
    slotEndAt: s1,
    scheduleKind,
  };
}

type Nav = { push: (href: Href) => void };

export function scheduleRouteContextToArena(
  ctx: LiveTrainingScheduleRouteContext | null
): ArenaScheduleSlotContext | null {
  if (!ctx) return null;
  const scheduleKind =
    ctx.scheduleKind === "ice" || ctx.scheduleKind === "ofp" ? ctx.scheduleKind : undefined;
  return {
    groupId: ctx.groupId,
    groupName: ctx.groupName,
    scheduleKind,
    slotStartAt: ctx.slotStartAt,
    slotEndAt: ctx.slotEndAt,
  };
}

/** С расписания: продолжить активную live/review той же команды или открыть старт с контекстом слота. */
export async function navigateToLiveTrainingFromScheduleSlot(
  router: Nav,
  slot: CoachTrainingSession
): Promise<void> {
  const ctx = coachScheduleSessionToRouteContext(slot);
  const q = serializeScheduleRouteContext(ctx);

  try {
    const active = await getActiveLiveTrainingSession();
    if (active && active.teamId === slot.teamId) {
      if (active.status === "live") {
        router.push(`/live-training/${active.id}/live` as Href);
        return;
      }
      if (active.status === "review") {
        router.push(`/live-training/${active.id}/review` as Href);
        return;
      }
    }
  } catch {
    /* fall through to start */
  }

  const teamQ = `teamId=${encodeURIComponent(slot.teamId)}`;
  router.push(`/live-training/start?${teamQ}&${q}` as Href);
}
