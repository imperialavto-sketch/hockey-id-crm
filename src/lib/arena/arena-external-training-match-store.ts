/**
 * PHASE 1: DEMO / MOCK ONLY — in-memory; not SSOT. See docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md.
 * ❗ NOT CORE SCHOOL SSOT — PHASE 6.
 * ⚠ MOCK MATCHING / UX stub: in-memory «оркестрация» без реальных переговоров и без автономного AI-агента.
 * ⚠ AI-ASSISTED, NOT AUTONOMOUS AGENT — таймеры и фазы имитируют прогресс для демо.
 * Потеря на рестарте сервера. Не расширять как production-critical state.
 */
import { randomBytes } from "crypto";
import { createExternalTrainingReport } from "@/lib/arena/external-training-reports";
import { resolveArenaCoachDisplayName } from "@/lib/arena/external-training-requests";

export type ArenaExternalTrainingMatchStatus =
  | "proposed"
  | "parent_confirmed"
  | "coach_contacted"
  | "scheduled"
  | "completed";

export type ArenaExternalTrainingMatch = {
  id: string;
  playerId: string;
  parentId: string;
  coachId: string;
  skillKey: string | null;
  focusText: string;
  status: ArenaExternalTrainingMatchStatus;
  externalRequestId: string | null;
  createdAt: string;
  updatedAt: string;
  proposedSlotStub: string | null;
  /** Когда перешли в scheduled (для детерминированного «прогресса» в UI). */
  scheduledAtMs: number | null;
  reportCreated: boolean;
};

export type ArenaAutonomousMatchPublicView = {
  id: string;
  coachId: string;
  coachName: string;
  status: ArenaExternalTrainingMatchStatus;
  /** UX-фаза без отдельного async job */
  displayPhase: "contacting" | "scheduled" | "completed";
  statusLine: string;
  proposedSlotStub: string | null;
  externalRequestId: string | null;
};

const matches = new Map<string, ArenaExternalTrainingMatch>();
const activeByPlayerParent = new Map<string, string>();

function indexKey(playerId: string, parentId: string): string {
  return `${playerId.trim()}::${parentId.trim()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class ArenaMatchConflictError extends Error {
  constructor(message = "Уже есть активный демо-цикл внешней тренировки") {
    super(message);
    this.name = "ArenaMatchConflictError";
  }
}

export function getActiveArenaMatch(
  playerId: string,
  parentId: string
): ArenaExternalTrainingMatch | null {
  const id = activeByPlayerParent.get(indexKey(playerId, parentId));
  if (!id) return null;
  return matches.get(id) ?? null;
}

function toPublicView(m: ArenaExternalTrainingMatch): ArenaAutonomousMatchPublicView {
  const coachName = resolveArenaCoachDisplayName(m.coachId);
  if (m.status === "completed") {
    return {
      id: m.id,
      coachId: m.coachId,
      coachName,
      status: m.status,
      displayPhase: "completed",
      statusLine:
        "Демо-цикл завершён. Краткий итог записан во внешний контур (не школьный live Arena).",
      proposedSlotStub: m.proposedSlotStub,
      externalRequestId: m.externalRequestId,
    };
  }
  if (m.status === "scheduled") {
    const t0 = m.scheduledAtMs ?? Date.now();
    const elapsed = Date.now() - t0;
    if (elapsed < 2800) {
      return {
        id: m.id,
        coachId: m.coachId,
        coachName,
        status: m.status,
        displayPhase: "contacting",
        statusLine: "Демо: имитация согласования слота (mock, не агент)",
        proposedSlotStub: null,
        externalRequestId: m.externalRequestId,
      };
    }
    return {
      id: m.id,
      coachId: m.coachId,
      coachName,
      status: m.status,
      displayPhase: "scheduled",
      statusLine: "Демо: слот задан заглушкой (не реальное бронирование)",
      proposedSlotStub: m.proposedSlotStub,
      externalRequestId: m.externalRequestId,
    };
  }
  return {
    id: m.id,
    coachId: m.coachId,
    coachName,
    status: m.status,
    displayPhase: "contacting",
    statusLine: "Демо: обработка подтверждения (stub)",
    proposedSlotStub: null,
    externalRequestId: m.externalRequestId,
  };
}

/**
 * Детерминированное завершение: после окна «scheduled» создаём stub-отчёт один раз.
 */
export async function tickArenaMatchAutomation(
  playerId: string,
  parentId: string
): Promise<ArenaAutonomousMatchPublicView | null> {
  const m = getActiveArenaMatch(playerId, parentId);
  if (!m || m.status !== "scheduled" || m.reportCreated) {
    return m ? toPublicView(m) : null;
  }
  const t0 = m.scheduledAtMs ?? Date.now();
  if (Date.now() - t0 < 6500) {
    return toPublicView(m);
  }
  const rid = m.externalRequestId?.trim();
  if (!rid) return toPublicView(m);

  try {
    await createExternalTrainingReport({
      requestId: rid,
      playerId: m.playerId,
      coachId: m.coachId,
      summary:
        "Внешний контур (MVP): тренировка отмечена как проведена. Итог сформирован правилами/заглушкой, не автономным агентом и не live Arena школы.",
      focusAreas: m.skillKey ? [m.skillKey] : [m.focusText.slice(0, 80)],
      resultNotes: m.focusText.slice(0, 400),
      nextSteps: null,
    });
    m.status = "completed";
    m.reportCreated = true;
    m.updatedAt = nowIso();
  } catch {
    /* оставляем scheduled — повтор при следующем GET */
  }

  return toPublicView(m);
}

/** Убрать завершённый матч из индекса через TTL, чтобы не «залипал» экран. */
export function pruneStaleCompletedMatch(playerId: string, parentId: string): void {
  const m = getActiveArenaMatch(playerId, parentId);
  if (!m || m.status !== "completed") return;
  const doneAt = new Date(m.updatedAt).getTime();
  if (Number.isNaN(doneAt) || Date.now() - doneAt < 45_000) return;
  const key = indexKey(playerId, parentId);
  activeByPlayerParent.delete(key);
  matches.delete(m.id);
}

export function getArenaAutonomousMatchView(
  playerId: string,
  parentId: string
): ArenaAutonomousMatchPublicView | null {
  pruneStaleCompletedMatch(playerId, parentId);
  const m = getActiveArenaMatch(playerId, parentId);
  if (!m) return null;
  return toPublicView(m);
}

/** GET: обновить автоматизацию (scheduled → completed + отчёт) и вернуть актуальный вид. */
export async function resolveArenaAutonomousMatchView(
  playerId: string,
  parentId: string
): Promise<ArenaAutonomousMatchPublicView | null> {
  pruneStaleCompletedMatch(playerId, parentId);
  await tickArenaMatchAutomation(playerId, parentId);
  pruneStaleCompletedMatch(playerId, parentId);
  return getArenaAutonomousMatchView(playerId, parentId);
}

/**
 * После подтверждения родителя: создаём запись матча и сразу переводим в scheduled (внутри — логические шаги parent_confirmed → coach_contacted → scheduled).
 */
export function createArenaMatchAfterParentConfirm(params: {
  playerId: string;
  parentId: string;
  coachId: string;
  skillKey: string | null;
  focusText: string;
  externalRequestId: string;
}): ArenaExternalTrainingMatch {
  const playerId = params.playerId.trim();
  const parentId = params.parentId.trim();
  const key = indexKey(playerId, parentId);
  const existingId = activeByPlayerParent.get(key);
  if (existingId) {
    const ex = matches.get(existingId);
    if (ex && ex.status !== "completed") {
      throw new ArenaMatchConflictError();
    }
    if (ex) {
      matches.delete(existingId);
      activeByPlayerParent.delete(key);
    }
  }

  const id = `aetm_${randomBytes(10).toString("hex")}`;
  const ts = nowIso();
  const stub =
    "Суббота · 10:00 — пример слота (mock); не реальное бронирование и не переговоры агента.";

  const row: ArenaExternalTrainingMatch = {
    id,
    playerId,
    parentId,
    coachId: params.coachId.trim(),
    skillKey: params.skillKey?.trim() || null,
    focusText: params.focusText.trim().slice(0, 480),
    status: "scheduled",
    externalRequestId: params.externalRequestId.trim(),
    createdAt: ts,
    updatedAt: ts,
    proposedSlotStub: stub,
    scheduledAtMs: Date.now(),
    reportCreated: false,
  };

  matches.set(id, row);
  activeByPlayerParent.set(key, id);
  return row;
}
