/**
 * Coach Input — local persistence layer
 * Persists sessionDraft and playerDevelopmentById via AsyncStorage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { SkillType } from "@/models/playerDevelopment";
import { createDefaultPlayerSkills, type PlayerSkillsMap } from "@/models/playerDevelopment";
import type {
  TrainingSessionDraft,
  SessionObservation,
  SessionStatus,
  ObservationImpact,
  CompletedTrainingSession,
} from "@/models/sessionObservation";
import type { SessionSyncStateMap } from "@/models/sessionSyncState";
import type { CoachSessionBundlePayload } from "@/models/coachSessionSync";
import { getCoachSessionPlayers } from "@/lib/getCoachSessionPlayers";

const STORAGE_KEY = "@hockey_coach_input_state";

export type EditedParentDraft = { headline: string; parentMessage: string };

export interface PersistedCoachInputState {
  sessionDraft: TrainingSessionDraft;
  playerDevelopmentById: Record<string, PlayerSkillsMap>;
  completedSessions: CompletedTrainingSession[];
  editedParentDrafts: Record<string, EditedParentDraft>;
  sessionSyncStateMap: SessionSyncStateMap;
  /** Frozen sync bundle per sessionId — built at confirm, used for retry */
  frozenSyncBundles: Record<string, CoachSessionBundlePayload>;
}

const VALID_SKILL_TYPES = new Set<string>(Object.values(SkillType));
const VALID_TRENDS = new Set(["up", "down", "stable"]);
const VALID_IMPACTS = new Set<ObservationImpact>(["positive", "negative", "neutral"]);
const VALID_STATUSES = new Set<SessionStatus>(["idle", "active", "review", "completed"]);

function isValidSkillType(s: unknown): s is SkillType {
  return typeof s === "string" && VALID_SKILL_TYPES.has(s);
}

function isValidObservation(raw: unknown): raw is SessionObservation {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.playerId === "string" &&
    typeof o.playerName === "string" &&
    isValidSkillType(o.skillType) &&
    VALID_IMPACTS.has(o.impact as ObservationImpact) &&
    typeof o.createdAt === "number" &&
    (o.note === undefined || typeof o.note === "string")
  );
}

function isValidPlayerSkill(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const s = raw as Record<string, unknown>;
  const score = typeof s.score === "number" && s.score >= 0 && s.score <= 100;
  const trend = typeof s.trend === "string" && VALID_TRENDS.has(s.trend);
  const confidence =
    typeof s.confidence === "number" && s.confidence >= 0 && s.confidence <= 1;
  const history = Array.isArray(s.history) && s.history.every((x) => typeof x === "number");
  return score && trend && confidence && history;
}

function parsePlayerSkillsMap(raw: unknown): PlayerSkillsMap | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const result: Partial<Record<SkillType, ReturnType<typeof createDefaultPlayerSkills>[SkillType]>> = {};
  const defaults = createDefaultPlayerSkills();

  for (const key of Object.keys(defaults)) {
    const sk = key as SkillType;
    const val = obj[sk];
    if (val && isValidPlayerSkill(val)) {
      const v = val as { score: number; trend: "up" | "down" | "stable"; confidence: number; history: number[] };
      result[sk] = { ...defaults[sk], ...v };
    } else {
      result[sk] = { ...defaults[sk] };
    }
  }
  return result as PlayerSkillsMap;
}

function parseCompletedSession(raw: unknown): CompletedTrainingSession | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (
    typeof d.id !== "string" ||
    typeof d.title !== "string" ||
    typeof d.startedAt !== "number" ||
    typeof d.endedAt !== "number" ||
    (d.status as string) !== "completed"
  ) {
    return null;
  }
  const observations: SessionObservation[] = Array.isArray(d.observations)
    ? d.observations.filter(isValidObservation)
    : [];
  return {
    id: d.id,
    title: d.title,
    startedAt: d.startedAt,
    endedAt: d.endedAt,
    status: "completed",
    observations,
  };
}

function parseCompletedSessions(raw: unknown): CompletedTrainingSession[] {
  if (!Array.isArray(raw)) return [];
  const out: CompletedTrainingSession[] = [];
  for (const item of raw) {
    const parsed = parseCompletedSession(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

function parseSessionDraft(raw: unknown): TrainingSessionDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (
    typeof d.id !== "string" ||
    typeof d.title !== "string" ||
    typeof d.startedAt !== "number" ||
    !VALID_STATUSES.has(d.status as SessionStatus)
  ) {
    return null;
  }
  const observations: SessionObservation[] = Array.isArray(d.observations)
    ? d.observations.filter(isValidObservation)
    : [];
  return {
    id: d.id,
    title: d.title,
    startedAt: d.startedAt,
    endedAt: typeof d.endedAt === "number" ? d.endedAt : undefined,
    status: d.status as SessionStatus,
    observations,
  };
}

function parsePlayerDevelopmentById(raw: unknown): Record<string, PlayerSkillsMap> | null {
  if (!raw || typeof raw !== "object") return null;
  const result: Record<string, PlayerSkillsMap> = {};
  const knownIds = new Set(getCoachSessionPlayers().map((p) => p.id));

  for (const id of Object.keys(raw)) {
    if (!knownIds.has(id)) continue;
    const parsed = parsePlayerSkillsMap((raw as Record<string, unknown>)[id]);
    if (parsed) result[id] = parsed;
  }

  for (const p of getCoachSessionPlayers()) {
    if (!result[p.id]) {
      result[p.id] = createDefaultPlayerSkills();
    }
  }
  return result;
}

const VALID_SYNC_STATES = new Set<string>(["pending", "syncing", "synced", "failed"]);

function isValidCoachSessionBundlePayload(raw: unknown): raw is CoachSessionBundlePayload {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  const session = o.session;
  if (!session || typeof session !== "object") return false;
  const s = session as Record<string, unknown>;
  if (typeof s.sessionId !== "string" || !s.sessionId.trim()) return false;
  if (!Array.isArray(o.playerSnapshots) || !Array.isArray(o.parentDrafts)) return false;
  return true;
}

function parseFrozenSyncBundles(raw: unknown): Record<string, CoachSessionBundlePayload> {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const result: Record<string, CoachSessionBundlePayload> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (isValidCoachSessionBundlePayload(val)) {
      result[key] = val;
    }
  }
  return result;
}

function parseSessionSyncStateMap(raw: unknown): SessionSyncStateMap {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const result: SessionSyncStateMap = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (!val || typeof val !== "object") continue;
    const v = val as Record<string, unknown>;
    const state = v.state;
    if (typeof state !== "string" || !VALID_SYNC_STATES.has(state)) continue;
    result[key] = {
      state: state as "pending" | "syncing" | "synced" | "failed",
      lastAttemptAt: typeof v.lastAttemptAt === "number" ? v.lastAttemptAt : undefined,
      lastSyncedAt: typeof v.lastSyncedAt === "number" ? v.lastSyncedAt : undefined,
      errorMessage: typeof v.errorMessage === "string" ? v.errorMessage : undefined,
    };
  }
  return result;
}

export function getDefaultCoachInputState(): PersistedCoachInputState {
  const playerDevelopmentById: Record<string, PlayerSkillsMap> = {};
  for (const p of getCoachSessionPlayers()) {
    playerDevelopmentById[p.id] = createDefaultPlayerSkills();
  }
  return {
    sessionDraft: {
      id: `session_${Date.now()}`,
      title: "Practice Session",
      startedAt: Date.now(),
      status: "idle",
      observations: [],
    },
    playerDevelopmentById,
    completedSessions: [],
    editedParentDrafts: {},
    sessionSyncStateMap: {},
    frozenSyncBundles: {},
  };
}

function parseEditedParentDrafts(raw: unknown): Record<string, EditedParentDraft> {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const result: Record<string, EditedParentDraft> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (
      val &&
      typeof val === "object" &&
      typeof (val as Record<string, unknown>).headline === "string" &&
      typeof (val as Record<string, unknown>).parentMessage === "string"
    ) {
      const v = val as EditedParentDraft;
      result[key] = { headline: v.headline, parentMessage: v.parentMessage };
    }
  }
  return result;
}

/**
 * Load persisted coach input state. Returns null if none exists or data is invalid.
 */
export async function loadCoachInputState(): Promise<PersistedCoachInputState | null> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return null;

    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    const sessionDraft = parseSessionDraft(obj.sessionDraft);
    const playerDevelopmentById = parsePlayerDevelopmentById(obj.playerDevelopmentById);

    if (!sessionDraft || !playerDevelopmentById) return null;

    const completedSessions = parseCompletedSessions(obj.completedSessions);
    const editedParentDrafts = parseEditedParentDrafts(obj.editedParentDrafts);
    const sessionSyncStateMap = parseSessionSyncStateMap(obj.sessionSyncStateMap);
    const frozenSyncBundles = parseFrozenSyncBundles(obj.frozenSyncBundles);

    return {
      sessionDraft,
      playerDevelopmentById,
      completedSessions,
      editedParentDrafts,
      sessionSyncStateMap,
      frozenSyncBundles,
    };
  } catch {
    return null;
  }
}

/**
 * Save coach input state to local storage.
 */
export async function saveCoachInputState(state: PersistedCoachInputState): Promise<void> {
  try {
    const toSave = {
      ...state,
      editedParentDrafts: state.editedParentDrafts ?? {},
      sessionSyncStateMap: state.sessionSyncStateMap ?? {},
      frozenSyncBundles: state.frozenSyncBundles ?? {},
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Silently ignore save failures
  }
}

/**
 * Clear all persisted coach input data.
 */
export async function clearCoachInputState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore
  }
}

/**
 * Reset only sessionDraft to idle/empty. Preserves completedSessions,
 * playerDevelopmentById, editedParentDrafts, sync state.
 */
export async function resetSessionDraftOnly(): Promise<void> {
  const state = await loadCoachInputState();
  if (!state) return;
  const freshDraft: TrainingSessionDraft = {
    id: `session_${Date.now()}`,
    title: "Тренировка",
    startedAt: Date.now(),
    status: "idle",
    observations: [],
  };
  await saveCoachInputState({
    ...state,
    sessionDraft: freshDraft,
  });
}
