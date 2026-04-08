/**
 * PHASE 19: снимок planning-контекста на старте live session (хранение + мягкая валидация).
 */

import type { Prisma } from "@prisma/client";

const MAX_PLAYERS = 12;
const MAX_DOMAINS = 8;
const MAX_REINFORCE = 6;
const MAX_SUMMARY_LINES = 6;
const MAX_SEED_BLOCKS = 8;
const MAX_STRING = 2000;
const MAX_REASONS = 5;
const MAX_SUGGESTION_SEED_ITEMS = 8;

/** PHASE 42: handoff стартовых приоритетов в live (внутри planningSnapshotJson). */
export type LiveTrainingPlanningSnapshotStartPrioritiesDto = {
  primaryPlayers: Array<{
    playerId: string;
    playerName: string;
    reason: string;
    source:
      | "continuity_lock_in"
      | "follow_up"
      | "planning_focus"
      | "recent_wrap_up"
      | "unresolved_priority_carry_forward";
  }>;
  primaryDomains: Array<{
    domain: string;
    labelRu: string;
    reason: string;
    source:
      | "continuity_lock_in"
      | "follow_up"
      | "planning_focus"
      | "recent_wrap_up"
      | "unresolved_priority_carry_forward";
  }>;
  secondaryItems: string[];
  reinforcementItems: string[];
  summaryLine?: string;
  lowData: boolean;
};

/** Контекст слота CRM-расписания внутри planningSnapshotJson (без новых таблиц). */
export type LiveTrainingScheduleSlotContextDto = {
  teamId: string;
  groupId: string | null;
  groupName?: string | null;
  trainingSlotId?: string | null;
  trainingType?: string | null;
  scheduledAt?: string | null;
  scheduledEndAt?: string | null;
};

/** Трассировка: сырые строки подсказок из отчётов (coach-app), без влияния на парсер доменов. */
export type LiveTrainingPlanningSnapshotSuggestionSeedsDto = {
  source: "report_action_layer";
  items: string[];
};

/** STEP 21: подтверждённый внешний подбор → стартовый planning (без правок SessionMeaning). */
export type LiveTrainingConfirmedExternalDevelopmentCarryDto = {
  playerId?: string;
  coachName: string;
  skills: string[];
  source: "external_coach";
};

/** STEP 22: отзыв о внешней работе (дополняет confirmed carry). */
export type LiveTrainingExternalCoachFeedbackCarryDto = {
  playerId?: string;
  coachName: string;
  summary: string;
  focusAreas: string[];
};

/** PHASE 6 Step 13: компактный перенос nextActions с последней подтверждённой сессии → старт новой. */
export type LiveTrainingPreviousSessionNextActionsCarryV1Dto = {
  version: 1;
  sourceLiveTrainingSessionId: string;
  trainingFocus: string[];
  teamAccents: string[];
  players: Array<{ playerId: string; playerName: string; actions: string[] }>;
};

const MAX_PREV_CARRY_FOCUS = 3;
const MAX_PREV_CARRY_TEAM = 3;
const MAX_PREV_CARRY_PLAYERS = 3;
const MAX_PREV_CARRY_ACTIONS = 3;

function parsePreviousSessionNextActionsCarryBlock(
  raw: unknown
): LiveTrainingPreviousSessionNextActionsCarryV1Dto | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return undefined;
  const sourceLiveTrainingSessionId =
    typeof o.sourceLiveTrainingSessionId === "string" ? o.sourceLiveTrainingSessionId.trim() : "";
  if (!sourceLiveTrainingSessionId) return undefined;

  const trainingFocus: string[] = [];
  if (Array.isArray(o.trainingFocus)) {
    for (const line of o.trainingFocus) {
      if (trainingFocus.length >= MAX_PREV_CARRY_FOCUS) break;
      if (typeof line === "string" && line.trim()) trainingFocus.push(line.trim().slice(0, 500));
    }
  }

  const teamAccents: string[] = [];
  if (Array.isArray(o.teamAccents)) {
    for (const line of o.teamAccents) {
      if (teamAccents.length >= MAX_PREV_CARRY_TEAM) break;
      if (typeof line === "string" && line.trim()) teamAccents.push(line.trim().slice(0, 500));
    }
  }

  const players: LiveTrainingPreviousSessionNextActionsCarryV1Dto["players"] = [];
  if (Array.isArray(o.players)) {
    for (const p of o.players) {
      if (players.length >= MAX_PREV_CARRY_PLAYERS) break;
      if (!p || typeof p !== "object" || Array.isArray(p)) continue;
      const row = p as Record<string, unknown>;
      const playerId = typeof row.playerId === "string" ? row.playerId.trim() : "";
      const playerName = typeof row.playerName === "string" ? row.playerName.trim().slice(0, 200) : "";
      if (!playerId || !playerName) continue;
      const actions: string[] = [];
      if (Array.isArray(row.actions)) {
        for (const a of row.actions) {
          if (actions.length >= MAX_PREV_CARRY_ACTIONS) break;
          if (typeof a === "string" && a.trim()) actions.push(a.trim().slice(0, 500));
        }
      }
      if (actions.length === 0) continue;
      players.push({ playerId, playerName, actions });
    }
  }

  if (trainingFocus.length === 0 && teamAccents.length === 0 && players.length === 0) {
    return undefined;
  }

  return {
    version: 1,
    sourceLiveTrainingSessionId,
    trainingFocus,
    teamAccents,
    players,
  };
}

const MAX_EXT_CARRY_SKILLS = 12;
const MAX_EXT_CARRY_COACH_NAME = 200;

function parseConfirmedExternalDevelopmentCarryBlock(
  raw: unknown
): LiveTrainingConfirmedExternalDevelopmentCarryDto | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  if (o.source !== "external_coach") return undefined;
  const coachName =
    typeof o.coachName === "string" ? o.coachName.trim().slice(0, MAX_EXT_CARRY_COACH_NAME) : "";
  if (!coachName) return undefined;
  const skills: string[] = [];
  if (Array.isArray(o.skills)) {
    for (const s of o.skills) {
      if (skills.length >= MAX_EXT_CARRY_SKILLS) break;
      if (typeof s === "string" && s.trim()) skills.push(s.trim().slice(0, 80));
    }
  }
  const out: LiveTrainingConfirmedExternalDevelopmentCarryDto = {
    coachName,
    skills,
    source: "external_coach",
  };
  const pid = typeof o.playerId === "string" ? o.playerId.trim().slice(0, 64) : "";
  if (pid) out.playerId = pid;
  return out;
}

const MAX_FB_CARRY_SUMMARY = 800;
const MAX_FB_CARRY_FOCUS = 6;
const MAX_FB_CARRY_COACH = 200;

function parseExternalCoachFeedbackCarryBlock(
  raw: unknown
): LiveTrainingExternalCoachFeedbackCarryDto | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const coachName =
    typeof o.coachName === "string" ? o.coachName.trim().slice(0, MAX_FB_CARRY_COACH) : "";
  const summary =
    typeof o.summary === "string" ? o.summary.trim().slice(0, MAX_FB_CARRY_SUMMARY) : "";
  if (!coachName || !summary) return undefined;
  const focusAreas: string[] = [];
  if (Array.isArray(o.focusAreas)) {
    for (const x of o.focusAreas) {
      if (focusAreas.length >= MAX_FB_CARRY_FOCUS) break;
      if (typeof x === "string" && x.trim()) focusAreas.push(x.trim().slice(0, 240));
    }
  }
  const out: LiveTrainingExternalCoachFeedbackCarryDto = { coachName, summary, focusAreas };
  const pid = typeof o.playerId === "string" ? o.playerId.trim().slice(0, 64) : "";
  if (pid) out.playerId = pid;
  return out;
}

export type LiveTrainingPlanningSnapshotDto = {
  generatedAt: string;
  teamId: string;
  focusPlayers: Array<{
    playerId: string;
    playerName: string;
    reasons: string[];
    priority: "high" | "medium" | "low";
  }>;
  focusDomains: Array<{
    domain: string;
    labelRu: string;
    reason: string;
    priority: "high" | "medium" | "low";
  }>;
  reinforceAreas: Array<{
    domain: string;
    labelRu: string;
    reason: string;
  }>;
  summaryLines: string[];
  planSeeds: {
    blocks: Array<{
      type: string;
      title: string;
      description: string;
      linkedDomains?: string[];
      focusPlayers?: Array<{ playerId: string; playerName: string }>;
    }>;
    lowData: boolean;
  };
  /** PHASE 42: опционально; старые снимки без поля валидны */
  startPriorities?: LiveTrainingPlanningSnapshotStartPrioritiesDto;
  /** Связь с тренировкой в расписании CRM (опционально). */
  scheduleSlotContext?: LiveTrainingScheduleSlotContextDto;
  /** PHASE 48: семена из подсказок по отчётам (опционально). */
  suggestionSeeds?: LiveTrainingPlanningSnapshotSuggestionSeedsDto;
  /** Arena / группа на льду: null или отсутствие = вся команда в ростере. */
  groupId?: string | null;
  /** PHASE 6 Step 13: перенос nextActions с прошлой подтверждённой сессии (опционально). */
  previousSessionNextActionsCarryV1?: LiveTrainingPreviousSessionNextActionsCarryV1Dto;
  /** STEP 21: подтверждённый внешний подбор для контура развития на старте. */
  confirmedExternalDevelopmentCarry?: LiveTrainingConfirmedExternalDevelopmentCarryDto;
  /** STEP 22: отзыв внешнего тренера (если сохранён для той же recommendation). */
  externalCoachFeedbackCarry?: LiveTrainingExternalCoachFeedbackCarryDto;
};

function isPriority(v: unknown): v is "high" | "medium" | "low" {
  return v === "high" || v === "medium" || v === "low";
}

const START_PRIO_MAX_PLAYERS = 4;
const START_PRIO_MAX_DOMAINS = 4;
const START_PRIO_MAX_SECONDARY = 4;
const START_PRIO_MAX_REINFORCE = 4;

function parseStartPrioritySource(
  v: unknown
): LiveTrainingPlanningSnapshotStartPrioritiesDto["primaryPlayers"][0]["source"] {
  if (
    v === "continuity_lock_in" ||
    v === "follow_up" ||
    v === "planning_focus" ||
    v === "recent_wrap_up" ||
    v === "unresolved_priority_carry_forward"
  ) {
    return v;
  }
  return "planning_focus";
}

/**
 * Мягкий разбор startPriorities; при мусоре — undefined (сессия всё равно стартует).
 */
function parseStartPrioritiesBlock(
  raw: unknown
): LiveTrainingPlanningSnapshotStartPrioritiesDto | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;

  const primaryPlayers: LiveTrainingPlanningSnapshotStartPrioritiesDto["primaryPlayers"] = [];
  if (Array.isArray(o.primaryPlayers)) {
    for (const p of o.primaryPlayers) {
      if (primaryPlayers.length >= START_PRIO_MAX_PLAYERS) break;
      if (!p || typeof p !== "object" || Array.isArray(p)) continue;
      const row = p as Record<string, unknown>;
      const playerId = typeof row.playerId === "string" ? row.playerId.trim() : "";
      const playerName = typeof row.playerName === "string" ? row.playerName.trim().slice(0, 200) : "";
      const reason = typeof row.reason === "string" ? row.reason.trim().slice(0, 500) : "";
      if (!playerId || !playerName) continue;
      primaryPlayers.push({
        playerId,
        playerName,
        reason: reason || "—",
        source: parseStartPrioritySource(row.source),
      });
    }
  }

  const primaryDomains: LiveTrainingPlanningSnapshotStartPrioritiesDto["primaryDomains"] = [];
  if (Array.isArray(o.primaryDomains)) {
    for (const d of o.primaryDomains) {
      if (primaryDomains.length >= START_PRIO_MAX_DOMAINS) break;
      if (!d || typeof d !== "object" || Array.isArray(d)) continue;
      const row = d as Record<string, unknown>;
      const domain = typeof row.domain === "string" ? row.domain.trim().slice(0, 64) : "";
      const labelRu = typeof row.labelRu === "string" ? row.labelRu.trim().slice(0, 120) : "";
      const reason = typeof row.reason === "string" ? row.reason.trim().slice(0, 500) : "";
      if (!domain || !labelRu) continue;
      primaryDomains.push({
        domain,
        labelRu,
        reason: reason || "—",
        source: parseStartPrioritySource(row.source),
      });
    }
  }

  const secondaryItems: string[] = [];
  if (Array.isArray(o.secondaryItems)) {
    for (const line of o.secondaryItems) {
      if (secondaryItems.length >= START_PRIO_MAX_SECONDARY) break;
      if (typeof line === "string" && line.trim()) secondaryItems.push(line.trim().slice(0, 500));
    }
  }

  const reinforcementItems: string[] = [];
  if (Array.isArray(o.reinforcementItems)) {
    for (const line of o.reinforcementItems) {
      if (reinforcementItems.length >= START_PRIO_MAX_REINFORCE) break;
      if (typeof line === "string" && line.trim()) reinforcementItems.push(line.trim().slice(0, 500));
    }
  }

  let summaryLine: string | undefined;
  if (typeof o.summaryLine === "string" && o.summaryLine.trim()) {
    summaryLine = o.summaryLine.trim().slice(0, 500);
  }

  const lowData = o.lowData === true;

  const hasBody =
    primaryPlayers.length > 0 ||
    primaryDomains.length > 0 ||
    secondaryItems.length > 0 ||
    reinforcementItems.length > 0 ||
    Boolean(summaryLine);

  if (!hasBody) return undefined;

  return {
    primaryPlayers,
    primaryDomains,
    secondaryItems,
    reinforcementItems,
    summaryLine,
    lowData,
  };
}

function sliceValidIso(raw: string): string | null {
  const t = raw.trim().slice(0, 80);
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Разбор блока контекста слота расписания (POST body или поле в JSON снимка).
 */
export function parseScheduleSlotContextBlock(
  raw: unknown,
  expectedTeamId: string
): LiveTrainingScheduleSlotContextDto | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const teamId = typeof o.teamId === "string" ? o.teamId.trim() : "";
  if (!teamId || teamId !== expectedTeamId) return null;

  let groupId: string | null = null;
  if (o.groupId === null || o.groupId === undefined) {
    groupId = null;
  } else if (typeof o.groupId === "string") {
    const g = o.groupId.trim();
    groupId = g.length > 0 ? g.slice(0, 64) : null;
  }

  const groupName =
    typeof o.groupName === "string" && o.groupName.trim()
      ? o.groupName.trim().slice(0, 200)
      : null;

  const trainingSlotId =
    typeof o.trainingSlotId === "string" && o.trainingSlotId.trim()
      ? o.trainingSlotId.trim().slice(0, 64)
      : null;

  const trainingType =
    typeof o.trainingType === "string" && o.trainingType.trim()
      ? o.trainingType.trim().slice(0, 32).toLowerCase()
      : null;

  const scheduledAt =
    typeof o.scheduledAt === "string" && o.scheduledAt.trim()
      ? sliceValidIso(o.scheduledAt)
      : null;
  const scheduledEndAt =
    typeof o.scheduledEndAt === "string" && o.scheduledEndAt.trim()
      ? sliceValidIso(o.scheduledEndAt)
      : null;

  return {
    teamId,
    groupId,
    groupName,
    trainingSlotId,
    trainingType,
    scheduledAt,
    scheduledEndAt,
  };
}

function parseSuggestionSeedsBlock(
  raw: unknown
): LiveTrainingPlanningSnapshotSuggestionSeedsDto | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  if (o.source !== "report_action_layer") return undefined;
  if (!Array.isArray(o.items)) return undefined;
  const items = o.items
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, 500))
    .slice(0, MAX_SUGGESTION_SEED_ITEMS);
  if (items.length === 0) return undefined;
  return { source: "report_action_layer", items };
}

function parseRootGroupId(o: Record<string, unknown>): string | null | undefined {
  if (!("groupId" in o)) return undefined;
  if (o.groupId === null) return null;
  if (typeof o.groupId === "string") {
    const g = o.groupId.trim();
    return g.length > 0 ? g.slice(0, 64) : null;
  }
  return undefined;
}

/** Нормализует объект снимка перед записью в JSONB (в т.ч. после добавления carry). */
export function parsePlanningObject(o: Record<string, unknown>): LiveTrainingPlanningSnapshotDto | null {
  const snapTeam =
    typeof o.teamId === "string" && o.teamId.trim() ? o.teamId.trim() : "";
  if (!snapTeam) return null;

  const rootGroupId = parseRootGroupId(o);

  const generatedAt =
    typeof o.generatedAt === "string" && o.generatedAt.trim()
      ? o.generatedAt.trim().slice(0, 80)
      : new Date().toISOString();

  const focusPlayers: LiveTrainingPlanningSnapshotDto["focusPlayers"] = [];
  if (Array.isArray(o.focusPlayers)) {
    for (const p of o.focusPlayers) {
      if (focusPlayers.length >= MAX_PLAYERS) break;
      if (!p || typeof p !== "object" || Array.isArray(p)) continue;
      const row = p as Record<string, unknown>;
      const playerId = typeof row.playerId === "string" ? row.playerId.trim() : "";
      const playerName = typeof row.playerName === "string" ? row.playerName.trim().slice(0, 200) : "";
      if (!playerId || !playerName) continue;
      const reasons: string[] = [];
      if (Array.isArray(row.reasons)) {
        for (const r of row.reasons) {
          if (reasons.length >= MAX_REASONS) break;
          if (typeof r === "string" && r.trim()) reasons.push(r.trim().slice(0, 500));
        }
      }
      const priority = isPriority(row.priority) ? row.priority : "medium";
      focusPlayers.push({ playerId, playerName, reasons, priority });
    }
  }

  const focusDomains: LiveTrainingPlanningSnapshotDto["focusDomains"] = [];
  if (Array.isArray(o.focusDomains)) {
    for (const d of o.focusDomains) {
      if (focusDomains.length >= MAX_DOMAINS) break;
      if (!d || typeof d !== "object" || Array.isArray(d)) continue;
      const row = d as Record<string, unknown>;
      const domain = typeof row.domain === "string" ? row.domain.trim().slice(0, 64) : "";
      const labelRu = typeof row.labelRu === "string" ? row.labelRu.trim().slice(0, 120) : "";
      const reason = typeof row.reason === "string" ? row.reason.trim().slice(0, 500) : "";
      if (!domain || !labelRu) continue;
      const priority = isPriority(row.priority) ? row.priority : "medium";
      focusDomains.push({ domain, labelRu, reason: reason || "—", priority });
    }
  }

  const reinforceAreas: LiveTrainingPlanningSnapshotDto["reinforceAreas"] = [];
  if (Array.isArray(o.reinforceAreas)) {
    for (const r of o.reinforceAreas) {
      if (reinforceAreas.length >= MAX_REINFORCE) break;
      if (!r || typeof r !== "object" || Array.isArray(r)) continue;
      const row = r as Record<string, unknown>;
      const domain = typeof row.domain === "string" ? row.domain.trim().slice(0, 64) : "";
      const labelRu = typeof row.labelRu === "string" ? row.labelRu.trim().slice(0, 120) : "";
      const reason = typeof row.reason === "string" ? row.reason.trim().slice(0, 500) : "";
      if (!domain || !labelRu) continue;
      reinforceAreas.push({ domain, labelRu, reason: reason || "—" });
    }
  }

  const summaryLines: string[] = [];
  if (Array.isArray(o.summaryLines)) {
    for (const line of o.summaryLines) {
      if (summaryLines.length >= MAX_SUMMARY_LINES) break;
      if (typeof line === "string" && line.trim()) summaryLines.push(line.trim().slice(0, 500));
    }
  }

  let planSeeds: LiveTrainingPlanningSnapshotDto["planSeeds"] = { blocks: [], lowData: true };
  if (o.planSeeds && typeof o.planSeeds === "object" && !Array.isArray(o.planSeeds)) {
    const ps = o.planSeeds as Record<string, unknown>;
    const lowData = ps.lowData === true;
    const blocks: LiveTrainingPlanningSnapshotDto["planSeeds"]["blocks"] = [];
    if (Array.isArray(ps.blocks)) {
      for (const b of ps.blocks) {
        if (blocks.length >= MAX_SEED_BLOCKS) break;
        if (!b || typeof b !== "object" || Array.isArray(b)) continue;
        const row = b as Record<string, unknown>;
        const type = typeof row.type === "string" ? row.type.trim().slice(0, 32) : "";
        const title = typeof row.title === "string" ? row.title.trim().slice(0, 200) : "";
        const description = typeof row.description === "string" ? row.description.trim().slice(0, MAX_STRING) : "";
        if (!type || !title || !description) continue;
        const block: (typeof blocks)[0] = { type, title, description };
        if (Array.isArray(row.linkedDomains)) {
          const ld = row.linkedDomains
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .map((x) => x.trim().slice(0, 64))
            .slice(0, 8);
          if (ld.length) block.linkedDomains = ld;
        }
        if (Array.isArray(row.focusPlayers)) {
          const fp: Array<{ playerId: string; playerName: string }> = [];
          for (const x of row.focusPlayers) {
            if (fp.length >= 6) break;
            if (!x || typeof x !== "object") continue;
            const pr = x as Record<string, unknown>;
            const pid = typeof pr.playerId === "string" ? pr.playerId.trim() : "";
            const pname = typeof pr.playerName === "string" ? pr.playerName.trim().slice(0, 200) : "";
            if (pid && pname) fp.push({ playerId: pid, playerName: pname });
          }
          if (fp.length) block.focusPlayers = fp;
        }
        blocks.push(block);
      }
    }
    planSeeds = { blocks, lowData };
  }

  const startPriorities = parseStartPrioritiesBlock(o.startPriorities);

  const base: LiveTrainingPlanningSnapshotDto = {
    generatedAt,
    teamId: snapTeam,
    focusPlayers,
    focusDomains,
    reinforceAreas,
    summaryLines,
    planSeeds,
  };
  if (rootGroupId !== undefined) {
    base.groupId = rootGroupId;
  }
  if (startPriorities) {
    base.startPriorities = startPriorities;
  }
  const scheduleSlotContext = parseScheduleSlotContextBlock(o.scheduleSlotContext, snapTeam);
  if (scheduleSlotContext) {
    base.scheduleSlotContext = scheduleSlotContext;
  }
  const suggestionSeeds = parseSuggestionSeedsBlock(o.suggestionSeeds);
  if (suggestionSeeds) {
    base.suggestionSeeds = suggestionSeeds;
  }
  const previousSessionNextActionsCarryV1 = parsePreviousSessionNextActionsCarryBlock(
    o.previousSessionNextActionsCarryV1
  );
  if (previousSessionNextActionsCarryV1) {
    base.previousSessionNextActionsCarryV1 = previousSessionNextActionsCarryV1;
  }
  const confirmedExternalDevelopmentCarry = parseConfirmedExternalDevelopmentCarryBlock(
    o.confirmedExternalDevelopmentCarry
  );
  if (confirmedExternalDevelopmentCarry) {
    base.confirmedExternalDevelopmentCarry = confirmedExternalDevelopmentCarry;
  }
  const externalCoachFeedbackCarry = parseExternalCoachFeedbackCarryBlock(o.externalCoachFeedbackCarry);
  if (externalCoachFeedbackCarry) {
    base.externalCoachFeedbackCarry = externalCoachFeedbackCarry;
  }
  return base;
}

/**
 * Разбирает тело запроса; при ошибке возвращает null (сессия создаётся без снимка).
 */
export function tryParsePlanningSnapshotForSessionStart(
  raw: unknown,
  expectedTeamId: string
): Prisma.InputJsonValue | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const dto = parsePlanningObject(raw as Record<string, unknown>);
  if (!dto || dto.teamId !== expectedTeamId) return null;
  return dto as unknown as Prisma.InputJsonValue;
}

function normalizeOptionalGroupId(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const g = v.trim();
    return g.length > 0 ? g.slice(0, 64) : null;
  }
  return null;
}

function extractGroupIdFromRawPlanning(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  return normalizeOptionalGroupId((raw as Record<string, unknown>).groupId);
}

/**
 * Сборка JSON для planningSnapshotJson при создании сессии: снимок планирования ± контекст слота расписания.
 * `teamId` и `groupId` всегда присутствуют в сохранённом JSON (`groupId` может быть null).
 */
export function composePlanningSnapshotJsonForCreate(input: {
  teamId: string;
  /** Явная группа с клиента; иначе берётся из scheduleSlotContext / planningSnapshot. */
  groupId?: string | null;
  planningSnapshot?: unknown;
  scheduleSlotContext?: unknown;
}): Prisma.InputJsonValue {
  const topSlot = parseScheduleSlotContextBlock(input.scheduleSlotContext, input.teamId);
  const parsedPlanning = tryParsePlanningSnapshotForSessionStart(
    input.planningSnapshot,
    input.teamId
  );

  const effectiveGroupId =
    normalizeOptionalGroupId(input.groupId) ??
    (topSlot?.groupId ?? null) ??
    extractGroupIdFromRawPlanning(input.planningSnapshot);

  const finalize = (core: Record<string, unknown>): Prisma.InputJsonValue => {
    const merged = {
      ...core,
      teamId: input.teamId,
      groupId: effectiveGroupId,
    };
    const dto = parsePlanningObject(merged);
    return (dto ?? merged) as unknown as Prisma.InputJsonValue;
  };

  if (parsedPlanning) {
    const merged: Record<string, unknown> = {
      ...(parsedPlanning as Record<string, unknown>),
      teamId: input.teamId,
      groupId: effectiveGroupId,
    };
    if (topSlot) {
      merged.scheduleSlotContext = topSlot;
    }
    return finalize(merged);
  }

  if (topSlot) {
    return finalize({
      generatedAt: new Date().toISOString(),
      teamId: input.teamId,
      groupId: effectiveGroupId,
      focusPlayers: [],
      focusDomains: [],
      reinforceAreas: [],
      summaryLines: [],
      planSeeds: { blocks: [], lowData: true },
      scheduleSlotContext: topSlot,
    });
  }

  return finalize({
    generatedAt: new Date().toISOString(),
    teamId: input.teamId,
    groupId: effectiveGroupId,
    focusPlayers: [],
    focusDomains: [],
    reinforceAreas: [],
    summaryLines: [],
    planSeeds: { blocks: [], lowData: true },
  });
}

export function parsePlanningSnapshotFromDb(
  json: Prisma.JsonValue | null | undefined
): LiveTrainingPlanningSnapshotDto | null {
  if (json === null || json === undefined) return null;
  if (typeof json !== "object" || Array.isArray(json)) return null;
  return parsePlanningObject(json as Record<string, unknown>);
}
