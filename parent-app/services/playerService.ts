import type { Player, PlayerStats, Recommendation, PlayerAIAnalysis, ScheduleItem, PlayerVideoAnalysis } from "@/types";
import type { PlayerProgressSnapshot, AchievementsResponse } from "@/types";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { mapApiPlayerToPlayer, type ApiPlayer } from "@/mappers/playerMapper";
import { mapApiStatsToPlayerStats, type ApiStats } from "@/mappers/statsMapper";
import { mapApiRecommendation, type ApiRecommendation } from "@/mappers/recommendationMapper";
import { mapApiScheduleItem, type ApiScheduleItem } from "@/mappers/scheduleMapper";
import { isDemoMode } from "@/config/api";
import { logApiError } from "@/lib/apiErrors";
import { mockPlayers } from "@/mocks/players";
import { mockPlayerStats } from "@/mocks/stats";
import { mockRecommendations } from "@/mocks/recommendations";
import { mockPlayerSchedule } from "@/mocks/schedule";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";
import { getMeSchedule } from "@/services/scheduleService";
import { getDemoPlayers, getDemoPlayerById, addDemoPlayer } from "@/demo/demoPlayers";

const PARENT_ID_HEADER = "x-parent-id";

/** Оценка с последней тренировки (GET /api/me/players/:id). */
export type LatestSessionEvaluation = {
  effort?: number;
  focus?: number;
  discipline?: number;
  note?: string;
};

/** Средние оценки за период (GET /api/me/players/:id, обычно 90 дней). */
export type EvaluationSummary = {
  totalEvaluations: number;
  avgEffort: number | null;
  avgFocus: number | null;
  avgDiscipline: number | null;
};

/** Текстовый отчёт тренера по последней тренировке (GET /api/me/players/:id). */
export type LatestSessionReport = {
  trainingId?: string;
  summary?: string | null;
  focusAreas?: string | null;
  coachNote?: string | null;
  parentMessage?: string | null;
  updatedAt?: string | null;
};

/** Backend (hockey-server / CRM) player response shape */
interface BackendPlayer {
  id: number | string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  birthYear?: number | null;
  age?: number | null;
  position?: string | null;
  parentId?: number | null;
  teamId?: number | null;
  team?: { name: string } | string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  games?: number | null;
  goals?: number | null;
  assists?: number | null;
  points?: number | null;
  pim?: number | null;
  stats?: {
    games?: number | null;
    goals?: number | null;
    assists?: number | null;
    points?: number | null;
    pim?: number | null;
  } | null;
  latestSessionEvaluation?: LatestSessionEvaluation | null;
  evaluationSummary?: {
    totalEvaluations?: number | null;
    avgEffort?: number | null;
    avgFocus?: number | null;
    avgDiscipline?: number | null;
  } | null;
  latestSessionReport?: {
    trainingId?: string | null;
    summary?: string | null;
    focusAreas?: string | null;
    coachNote?: string | null;
    parentMessage?: string | null;
    updatedAt?: string | null;
  } | null;
}

/** Backend playerStat row shape from GET /api/players/:id/stats */
interface BackendPlayerStat {
  games?: number | null;
  goals?: number | null;
  assists?: number | null;
  points?: number | null;
  pim?: number | null;
}

function normalizeLatestSessionEvaluation(
  raw: BackendPlayer["latestSessionEvaluation"]
): LatestSessionEvaluation | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown): number | undefined =>
    typeof v === "number" && v >= 1 && v <= 5 ? v : undefined;
  const effort = num(r.effort);
  const focus = num(r.focus);
  const discipline = num(r.discipline);
  const noteRaw = r.note;
  const note =
    typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : undefined;
  if (
    effort == null &&
    focus == null &&
    discipline == null &&
    note == null
  ) {
    return null;
  }
  const out: LatestSessionEvaluation = {};
  if (effort != null) out.effort = effort;
  if (focus != null) out.focus = focus;
  if (discipline != null) out.discipline = discipline;
  if (note != null) out.note = note;
  return out;
}

const EMPTY_EVALUATION_SUMMARY: EvaluationSummary = {
  totalEvaluations: 0,
  avgEffort: null,
  avgFocus: null,
  avgDiscipline: null,
};

function normalizeEvaluationSummary(
  raw: BackendPlayer["evaluationSummary"]
): EvaluationSummary {
  if (raw == null || typeof raw !== "object") {
    return { ...EMPTY_EVALUATION_SUMMARY };
  }
  const r = raw as Record<string, unknown>;
  const totalRaw = Number(r.totalEvaluations);
  const total =
    Number.isFinite(totalRaw) && totalRaw >= 0
      ? Math.floor(totalRaw)
      : 0;
  const numOrNull = (v: unknown): number | null => {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    return Math.round(v * 10) / 10;
  };
  return {
    totalEvaluations: total,
    avgEffort: numOrNull(r.avgEffort),
    avgFocus: numOrNull(r.avgFocus),
    avgDiscipline: numOrNull(r.avgDiscipline),
  };
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function normalizeLatestSessionReport(
  raw: BackendPlayer["latestSessionReport"]
): LatestSessionReport | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const trainingIdRaw = r.trainingId;
  const trainingId =
    typeof trainingIdRaw === "string"
      ? strOrNull(trainingIdRaw) ?? undefined
      : typeof trainingIdRaw === "number" && Number.isFinite(trainingIdRaw)
        ? String(trainingIdRaw)
        : undefined;

  const summary = strOrNull(r.summary);
  const focusAreas = strOrNull(r.focusAreas);
  const coachNote = strOrNull(r.coachNote);
  const parentMessage = strOrNull(r.parentMessage);

  const updatedAtRaw = r.updatedAt;
  const updatedAt =
    typeof updatedAtRaw === "string" && updatedAtRaw.trim()
      ? updatedAtRaw.trim()
      : null;

  if (
    summary == null &&
    focusAreas == null &&
    coachNote == null &&
    parentMessage == null
  ) {
    return null;
  }

  const out: LatestSessionReport = {};
  if (trainingId != null) out.trainingId = trainingId;
  if (summary != null) out.summary = summary;
  if (focusAreas != null) out.focusAreas = focusAreas;
  if (coachNote != null) out.coachNote = coachNote;
  if (parentMessage != null) out.parentMessage = parentMessage;
  if (updatedAt != null) out.updatedAt = updatedAt;
  return out;
}

function getStatsFallbackFromBackendPlayer(player: BackendPlayer): PlayerStats | null {
  const source = player.stats ?? player;
  const games = Number(source.games ?? 0);
  const goals = Number(source.goals ?? 0);
  const assists = Number(source.assists ?? 0);
  const points = Number(source.points ?? goals + assists);
  const pim = Number(source.pim ?? 0);

  if ([games, goals, assists, points, pim].every((value) => value === 0)) {
    return null;
  }

  return mapApiStatsToPlayerStats({
    games,
    goals,
    assists,
    points,
    pim,
  });
}

async function getBasePlayerProfile(
  id: string
): Promise<{
  player: Player | null;
  statsFallback: PlayerStats | null;
  latestSessionEvaluation: LatestSessionEvaluation | null;
  evaluationSummary: EvaluationSummary;
  latestSessionReport: LatestSessionReport | null;
}> {
  let data: BackendPlayer | null;
  try {
    data = await apiFetch<BackendPlayer>(`/api/me/players/${encodeURIComponent(id)}`, {
      timeoutMs: 6000,
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return {
        player: null,
        statsFallback: null,
        latestSessionEvaluation: null,
        evaluationSummary: { ...EMPTY_EVALUATION_SUMMARY },
        latestSessionReport: null,
      };
    }
    throw error;
  }

  if (data && typeof data === "object" && data.id != null) {
    return {
      player: mapApiPlayerToPlayer(mapBackendPlayerToApiPlayer(data)),
      statsFallback: getStatsFallbackFromBackendPlayer(data),
      latestSessionEvaluation: normalizeLatestSessionEvaluation(
        data.latestSessionEvaluation
      ),
      evaluationSummary: normalizeEvaluationSummary(data.evaluationSummary),
      latestSessionReport: normalizeLatestSessionReport(data.latestSessionReport),
    };
  }

  return {
    player: null,
    statsFallback: null,
    latestSessionEvaluation: null,
    evaluationSummary: { ...EMPTY_EVALUATION_SUMMARY },
    latestSessionReport: null,
  };
}

function mapBackendPlayerToApiPlayer(b: BackendPlayer): ApiPlayer {
  const currentYear = new Date().getFullYear();
  const fallbackBirthYear = currentYear - 10;
  const fullName = String(b.name ?? "").trim();
  const [derivedFirstName = "", ...restName] = fullName ? fullName.split(/\s+/) : [];
  const derivedLastName = restName.join(" ");
  const firstName = b.firstName ?? derivedFirstName;
  const lastName = b.lastName ?? derivedLastName;
  const birthYear = b.birthYear ?? (b.age ? currentYear - Number(b.age) : fallbackBirthYear);
  const teamName =
    typeof b.team === "string"
      ? b.team
      : b.team?.name ?? "";

  return {
    id: String(b.id),
    firstName,
    lastName,
    birthYear,
    age: b.age ?? undefined,
    position: b.position ?? undefined,
    team: teamName,
    avatarUrl: (b.avatarUrl ?? b.avatar ?? null) as string | null | undefined,
  };
}

export interface FullPlayerProfile {
  player: Player;
  stats: PlayerStats | null;
  schedule: ScheduleItem[];
  recommendations: Recommendation[];
  progressHistory: PlayerProgressSnapshot[];
  achievements: AchievementsResponse | null;
  videoAnalyses: PlayerVideoAnalysis[];
  latestSessionEvaluation: LatestSessionEvaluation | null;
  evaluationSummary: EvaluationSummary;
  latestSessionReport: LatestSessionReport | null;
}

const MOCK_FULL_PROFILE: FullPlayerProfile = {
  player: mockPlayers[0],
  stats: mockPlayerStats[PLAYER_MARK_GOLYSH.id] ?? mockPlayerStats["1"] ?? null,
  schedule: mockPlayerSchedule[PLAYER_MARK_GOLYSH.id] ?? mockPlayerSchedule["1"] ?? [],
  recommendations: mockRecommendations[PLAYER_MARK_GOLYSH.id] ?? mockRecommendations["1"] ?? [],
  progressHistory: [],
  achievements: { unlocked: [], locked: [] },
  videoAnalyses: [],
  latestSessionEvaluation: null,
  evaluationSummary: {
    totalEvaluations: 12,
    avgEffort: 4.3,
    avgFocus: 3.8,
    avgDiscipline: 4.7,
  },
  latestSessionReport: {
    trainingId: "demo-training",
    parentMessage:
      "Стабильная игра в средней зоне. Продолжаем работать над скоростью первых шагов.",
    focusAreas: "катание с шайбой, выход из угла",
    updatedAt: new Date().toISOString(),
  },
};

async function getDemoFullProfile(playerId: string): Promise<FullPlayerProfile | null> {
  const player = getDemoPlayerById(playerId) ?? getDemoPlayers()[0] ?? null;
  if (!player) return null;
  const schedule = mockPlayerSchedule[player.id] ?? [];
  return {
    player,
    stats: MOCK_FULL_PROFILE.stats,
    schedule,
    recommendations: MOCK_FULL_PROFILE.recommendations,
    progressHistory: MOCK_FULL_PROFILE.progressHistory,
    achievements: MOCK_FULL_PROFILE.achievements,
    videoAnalyses: MOCK_FULL_PROFILE.videoAnalyses,
    latestSessionEvaluation: MOCK_FULL_PROFILE.latestSessionEvaluation,
    evaluationSummary: MOCK_FULL_PROFILE.evaluationSummary,
    latestSessionReport: MOCK_FULL_PROFILE.latestSessionReport,
  };
}

/** Fetch full player profile from backend: getPlayer + getMeSchedule, with demo fallback. */
export async function getFullPlayerProfile(
  playerId: string,
  parentId: string,
  _options?: { includeVideoAnalyses?: boolean }
): Promise<FullPlayerProfile | null> {
  if (isDemoMode) {
    return getDemoFullProfile(playerId);
  }

  const [playerResult, scheduleResult, statsResult, recommendationsResult] = await Promise.allSettled([
    getBasePlayerProfile(playerId),
    getMeSchedule(),
    getPlayerStats(playerId, parentId),
    getCoachRecommendations(playerId, parentId),
  ]);

  if (playerResult.status === "rejected") {
    throw playerResult.reason;
  }

  const {
    player,
    statsFallback,
    latestSessionEvaluation,
    evaluationSummary,
    latestSessionReport,
  } = playerResult.value;
  if (!player) return null;

  return {
    player,
    stats:
      statsResult.status === "fulfilled" && statsResult.value
        ? statsResult.value
        : statsFallback,
    schedule: scheduleResult.status === "fulfilled" ? scheduleResult.value : [],
    recommendations: recommendationsResult.status === "fulfilled" ? recommendationsResult.value : [],
    progressHistory: [],
    achievements: { unlocked: [], locked: [] },
    videoAnalyses: [],
    latestSessionEvaluation,
    evaluationSummary,
    latestSessionReport,
  };
}

function useFallbackPlayerById(id: string): Player | null {
  return mockPlayers.find((p) => p.id === id) ?? null;
}

function useFallbackStats(playerId: string): PlayerStats | null {
  return mockPlayerStats[playerId] ?? null;
}

function useFallbackRecommendations(playerId: string): Recommendation[] {
  return mockRecommendations[playerId] ?? [];
}

function normalizeAIAnalysisResponse(data: unknown): PlayerAIAnalysis | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = Array.isArray(data) && data.length > 0 ? data[0] : data;
  const record = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;

  const summary = String(record.summary ?? record.report ?? "");
  const strengths = Array.isArray(record.strengths) ? record.strengths.map(String) : [];
  const growthAreas = Array.isArray(record.growthAreas)
    ? record.growthAreas.map(String)
    : Array.isArray(record.weaknesses)
      ? record.weaknesses.map(String)
      : [];
  const recommendations = Array.isArray(record.recommendations)
    ? record.recommendations.map(String)
    : [];
  const coachFocus = Array.isArray(record.coachFocus) ? record.coachFocus.map(String) : [];
  const motivation = String(record.motivation ?? "");

  if (!summary && strengths.length === 0 && growthAreas.length === 0 && recommendations.length === 0) {
    return null;
  }

  return {
    summary,
    strengths,
    growthAreas,
    recommendations,
    coachFocus,
    motivation,
  };
}

/** Fetch players from backend (GET /api/me/players). */
export async function getPlayers(_parentId: string): Promise<Player[]> {
  if (isDemoMode) {
    return getDemoPlayers();
  }

  const data = await apiFetch<BackendPlayer[]>("/api/me/players", {
    timeoutMs: 6000,
  });
  if (!Array.isArray(data)) {
    throw new Error("Invalid players response");
  }
  return data.map((p) => mapApiPlayerToPlayer(mapBackendPlayerToApiPlayer(p)));
}

/** Fetch single player from backend (GET /api/me/players/:id). */
export async function getPlayerById(id: string, _parentId?: string): Promise<Player | null> {
  if (isDemoMode) {
    return getDemoPlayerById(id) ?? useFallbackPlayerById(id);
  }

  const data = await apiFetch<BackendPlayer>(`/api/me/players/${encodeURIComponent(id)}`, {
    timeoutMs: 6000,
  });
  if (data && typeof data === "object" && data.id != null) {
    return mapApiPlayerToPlayer(mapBackendPlayerToApiPlayer(data));
  }
  return null;
}

/** Create a player on the backend (POST /api/players). */
export async function createPlayer(data: {
  firstName: string;
  lastName: string;
  birthYear: number;
  position?: string;
  parentId: number;
  teamId?: number | null;
}): Promise<Player> {
  const created = await apiFetch<BackendPlayer>("/api/players", {
    method: "POST",
    body: JSON.stringify(data),
    timeoutMs: 6000,
  });
  return mapApiPlayerToPlayer(mapBackendPlayerToApiPlayer(created));
}

/**
 * Create player for current parent (POST /api/me/players).
 * Uses parent auth token — parentId is taken from server.
 * In demo mode: adds to in-memory list and returns.
 */
export async function createPlayerForParent(data: {
  firstName: string;
  lastName: string;
  birthYear: number;
  position?: string;
}): Promise<Player> {
  if (isDemoMode) {
    const id = `demo-${Date.now()}`;
    const name = `${data.firstName} ${data.lastName}`.trim() || "Игрок";
    const age = new Date().getFullYear() - data.birthYear;
    const player: Player = {
      id,
      name,
      age,
      birthYear: data.birthYear,
      team: "",
      position: data.position ?? "Нападающий",
      number: 0,
      parentName: "",
      status: "active",
      avatarUrl: null,
    };
    addDemoPlayer(player);
    return player;
  }

  const created = await apiFetch<BackendPlayer>("/api/me/players", {
    method: "POST",
    body: JSON.stringify({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      birthYear: data.birthYear,
      position: data.position?.trim() || undefined,
    }),
    timeoutMs: 6000,
  });
  return mapApiPlayerToPlayer(mapBackendPlayerToApiPlayer(created));
}

/** Сводка посещаемости по TrainingSession (GET /api/players/:id/attendance-summary). */
export interface PlayerAttendanceSummary {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

function attendanceSummaryRangeDays(days: number): { fromDate: string; toDate: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);
  const ymd = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return { fromDate: ymd(from), toDate: ymd(to) };
}

/** Период по умолчанию: последние 90 дней (UTC). */
export async function getPlayerAttendanceSummary(
  playerId: string,
  _parentId: string
): Promise<PlayerAttendanceSummary | null> {
  if (isDemoMode) {
    return {
      totalSessions: 10,
      presentCount: 8,
      absentCount: 2,
      attendanceRate: 80,
    };
  }

  try {
    const { fromDate, toDate } = attendanceSummaryRangeDays(90);
    const qs = new URLSearchParams({ fromDate, toDate });
    return await apiFetch<PlayerAttendanceSummary>(
      `/api/players/${encodeURIComponent(playerId)}/attendance-summary?${qs.toString()}`,
      { timeoutMs: 8000 }
    );
  } catch (err) {
    logApiError("playerService.getPlayerAttendanceSummary", err);
    return null;
  }
}

/** Fetch player stats. Requires parentId for auth. */
export async function getPlayerStats(
  playerId: string,
  _parentId: string
): Promise<PlayerStats | null> {
  if (isDemoMode) {
    return useFallbackStats(playerId);
  }

  try {
    const raw = await apiFetch<BackendPlayerStat[] | BackendPlayerStat | unknown>(
      `/api/players/${playerId}/stats`
    );
    const rows = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object"
        ? [raw as BackendPlayerStat]
        : [];
    if (rows.length === 0) {
      return null;
    }
    const agg: ApiStats = rows.reduce(
      (acc, row) => ({
        games: (acc.games ?? 0) + Number(row.games ?? 0),
        goals: (acc.goals ?? 0) + Number(row.goals ?? 0),
        assists: (acc.assists ?? 0) + Number(row.assists ?? 0),
        points: (acc.points ?? 0) + Number(row.points ?? 0),
        pim: (acc.pim ?? 0) + Number(row.pim ?? 0),
      }),
      { games: 0, goals: 0, assists: 0, points: 0, pim: 0 }
    );
    return mapApiStatsToPlayerStats(agg);
  } catch (err) {
    logApiError("playerService.getPlayerStats", err);
    throw err;
  }
}

/** Fetch coach recommendations. Requires parentId for auth. */
export async function getCoachRecommendations(
  playerId: string,
  _parentId: string
): Promise<Recommendation[]> {
  if (isDemoMode) {
    return useFallbackRecommendations(playerId);
  }

  try {
    const data = await apiFetch<ApiRecommendation[]>(
      `/api/parent/mobile/player/${playerId}/recommendations`
    );
    if (Array.isArray(data)) {
      return data.map(mapApiRecommendation).filter((r) => r.text);
    }
    return [];
  } catch (err) {
    logApiError("playerService.getCoachRecommendations", err);
    throw err;
  }
}

/** GET /api/parent/mobile/player/:id/materials — отчёты, задачи и черновики тренера для игрока. */
export type ParentCoachMaterialReport = {
  id: string;
  playerId: string | null;
  title: string;
  contentPreview: string;
  createdAt: string;
  voiceNoteId: string | null;
};

export type ParentCoachMaterialAction = {
  id: string;
  playerId: string | null;
  title: string;
  descriptionPreview: string;
  status: string;
  createdAt: string;
  voiceNoteId: string | null;
};

export type ParentCoachMaterialDraft = {
  id: string;
  playerId: string | null;
  textPreview: string;
  createdAt: string;
  voiceNoteId: string | null;
};

export type ParentPlayerCoachMaterials = {
  reports: ParentCoachMaterialReport[];
  actions: ParentCoachMaterialAction[];
  parentDrafts: ParentCoachMaterialDraft[];
};

function parseCoachMaterialReport(x: unknown): ParentCoachMaterialReport | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id.trim() : "";
  if (!id) return null;
  return {
    id,
    playerId: typeof r.playerId === "string" ? r.playerId : null,
    title: typeof r.title === "string" ? r.title : "",
    contentPreview: typeof r.contentPreview === "string" ? r.contentPreview : "",
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    voiceNoteId:
      typeof r.voiceNoteId === "string"
        ? r.voiceNoteId
        : r.voiceNoteId === null
          ? null
          : null,
  };
}

function parseCoachMaterialAction(x: unknown): ParentCoachMaterialAction | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id.trim() : "";
  if (!id) return null;
  return {
    id,
    playerId: typeof r.playerId === "string" ? r.playerId : null,
    title: typeof r.title === "string" ? r.title : "",
    descriptionPreview:
      typeof r.descriptionPreview === "string" ? r.descriptionPreview : "",
    status: typeof r.status === "string" ? r.status : "open",
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    voiceNoteId:
      typeof r.voiceNoteId === "string"
        ? r.voiceNoteId
        : r.voiceNoteId === null
          ? null
          : null,
  };
}

function parseCoachMaterialDraft(x: unknown): ParentCoachMaterialDraft | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id.trim() : "";
  if (!id) return null;
  return {
    id,
    playerId: typeof r.playerId === "string" ? r.playerId : null,
    textPreview: typeof r.textPreview === "string" ? r.textPreview : "",
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    voiceNoteId:
      typeof r.voiceNoteId === "string"
        ? r.voiceNoteId
        : r.voiceNoteId === null
          ? null
          : null,
  };
}

function normalizeParentCoachMaterials(raw: unknown): ParentPlayerCoachMaterials {
  if (!raw || typeof raw !== "object") {
    return { reports: [], actions: [], parentDrafts: [] };
  }
  const o = raw as Record<string, unknown>;
  const reports = Array.isArray(o.reports)
    ? o.reports.map(parseCoachMaterialReport).filter((x): x is ParentCoachMaterialReport => x != null)
    : [];
  const actions = Array.isArray(o.actions)
    ? o.actions.map(parseCoachMaterialAction).filter((x): x is ParentCoachMaterialAction => x != null)
    : [];
  const parentDrafts = Array.isArray(o.parentDrafts)
    ? o.parentDrafts
        .map(parseCoachMaterialDraft)
        .filter((x): x is ParentCoachMaterialDraft => x != null)
    : [];
  return { reports, actions, parentDrafts };
}

/** Материалы тренера из CRM (Report / ActionItem / ParentDraft). В demo — пусто. */
export async function getPlayerCoachMaterials(
  playerId: string,
  _parentId: string
): Promise<ParentPlayerCoachMaterials> {
  if (isDemoMode) {
    return { reports: [], actions: [], parentDrafts: [] };
  }

  try {
    const data = await apiFetch<unknown>(
      `/api/parent/mobile/player/${encodeURIComponent(playerId)}/materials`
    );
    return normalizeParentCoachMaterials(data);
  } catch (err) {
    logApiError("playerService.getPlayerCoachMaterials", err);
    throw err;
  }
}

/** Полный отчёт тренера (CRM Report) для родителя. */
export type ParentCoachReportDetail = {
  id: string;
  playerId: string | null;
  title: string;
  content: string;
  createdAt: string;
  voiceNoteId: string | null;
};

function parseCoachReportDetail(raw: unknown): ParentCoachReportDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id.trim() : "";
  if (!id) return null;
  const title = typeof r.title === "string" ? r.title : "";
  const content = typeof r.content === "string" ? r.content : "";
  const createdAt = typeof r.createdAt === "string" ? r.createdAt : "";
  return {
    id,
    playerId: typeof r.playerId === "string" ? r.playerId : null,
    title,
    content,
    createdAt,
    voiceNoteId:
      typeof r.voiceNoteId === "string"
        ? r.voiceNoteId
        : r.voiceNoteId === null
          ? null
          : null,
  };
}

export async function getPlayerCoachReportDetail(
  playerId: string,
  reportId: string,
  _parentId: string
): Promise<ParentCoachReportDetail | null> {
  if (isDemoMode) {
    return null;
  }

  try {
    const data = await apiFetch<unknown>(
      `/api/parent/mobile/player/${encodeURIComponent(playerId)}/reports/${encodeURIComponent(reportId)}`
    );
    return parseCoachReportDetail(data);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return null;
    }
    logApiError("playerService.getPlayerCoachReportDetail", err);
    throw err;
  }
}

/** Полная задача тренера (CRM ActionItem) для родителя. */
export type ParentActionItemDetail = {
  id: string;
  playerId: string | null;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  voiceNoteId: string | null;
};

function parseActionItemDetail(raw: unknown): ParentActionItemDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id.trim() : "";
  if (!id) return null;
  const title = typeof r.title === "string" ? r.title : "";
  const description = typeof r.description === "string" ? r.description : "";
  const status = typeof r.status === "string" ? r.status : "";
  const createdAt = typeof r.createdAt === "string" ? r.createdAt : "";
  let dueDate: string | null = null;
  if (typeof r.dueDate === "string" && r.dueDate.trim()) {
    dueDate = r.dueDate.trim();
  } else if (r.dueDate === null) {
    dueDate = null;
  }
  return {
    id,
    playerId: typeof r.playerId === "string" ? r.playerId : null,
    title,
    description,
    status,
    dueDate,
    createdAt,
    voiceNoteId:
      typeof r.voiceNoteId === "string"
        ? r.voiceNoteId
        : r.voiceNoteId === null
          ? null
          : null,
  };
}

export async function getPlayerActionItemDetail(
  playerId: string,
  actionItemId: string,
  _parentId: string
): Promise<ParentActionItemDetail | null> {
  if (isDemoMode) {
    return null;
  }

  try {
    const data = await apiFetch<unknown>(
      `/api/parent/mobile/player/${encodeURIComponent(playerId)}/action-items/${encodeURIComponent(actionItemId)}`
    );
    return parseActionItemDetail(data);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return null;
    }
    logApiError("playerService.getPlayerActionItemDetail", err);
    throw err;
  }
}

/** Полный черновик сообщения тренера для родителя (standalone ParentDraft). */
export type ParentDraftDetail = {
  id: string;
  playerId: string | null;
  title: string | null;
  content: string;
  status: string | null;
  createdAt: string;
  updatedAt: string | null;
  voiceNoteId: string | null;
};

function parseParentDraftDetail(raw: unknown): ParentDraftDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id.trim() : "";
  if (!id) return null;
  const content = typeof r.content === "string" ? r.content : "";
  const createdAt = typeof r.createdAt === "string" ? r.createdAt : "";
  const title =
    typeof r.title === "string"
      ? r.title.trim() || null
      : r.title === null
        ? null
        : null;
  const status =
    typeof r.status === "string"
      ? r.status.trim() || null
      : r.status === null
        ? null
        : null;
  let updatedAt: string | null = null;
  if (typeof r.updatedAt === "string" && r.updatedAt.trim()) {
    updatedAt = r.updatedAt.trim();
  } else if (r.updatedAt === null) {
    updatedAt = null;
  }
  return {
    id,
    playerId: typeof r.playerId === "string" ? r.playerId : null,
    title,
    content,
    status,
    createdAt,
    updatedAt,
    voiceNoteId:
      typeof r.voiceNoteId === "string"
        ? r.voiceNoteId
        : r.voiceNoteId === null
          ? null
          : null,
  };
}

export async function getPlayerParentDraftDetail(
  playerId: string,
  draftId: string,
  _parentId: string
): Promise<ParentDraftDetail | null> {
  if (isDemoMode) {
    return null;
  }

  try {
    const data = await apiFetch<unknown>(
      `/api/parent/mobile/player/${encodeURIComponent(playerId)}/parent-drafts/${encodeURIComponent(draftId)}`
    );
    return parseParentDraftDetail(data);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return null;
    }
    logApiError("playerService.getPlayerParentDraftDetail", err);
    throw err;
  }
}

/** Lightweight player context for Coach Mark. Fetches player, stats, AI analysis. */
export async function getPlayerContextForCoachMark(
  playerId: string,
  parentId: string
): Promise<{
  id: string;
  name?: string;
  age?: number;
  birthYear?: number;
  position?: string;
  team?: string;
  stats?: { games?: number; goals?: number; assists?: number; points?: number };
  aiAnalysis?: {
    summary?: string;
    strengths?: string[];
    growthAreas?: string[];
  };
} | null> {
  try {
    const [playerResult, statsResult, aiResult] = await Promise.allSettled([
      getPlayerById(playerId, parentId),
      getPlayerStats(playerId, parentId),
      getAIAnalysis(playerId, parentId),
    ]);

    const player = playerResult.status === "fulfilled" ? playerResult.value : null;
    if (!player) return null;

    const stats = statsResult.status === "fulfilled" ? statsResult.value : null;
    const aiAnalysis = aiResult.status === "fulfilled" ? aiResult.value : null;

    return {
      id: player.id,
      name: player.name?.trim() || undefined,
      age: player.age ?? undefined,
      birthYear: player.birthYear ?? undefined,
      position: player.position || undefined,
      team: player.team || undefined,
      stats: stats
        ? {
            games: stats.games,
            goals: stats.goals,
            assists: stats.assists,
            points: stats.points,
          }
        : undefined,
      aiAnalysis: aiAnalysis
        ? {
            summary: aiAnalysis.summary || undefined,
            strengths:
              aiAnalysis.strengths?.length ? aiAnalysis.strengths : undefined,
            growthAreas:
              aiAnalysis.growthAreas?.length
                ? aiAnalysis.growthAreas
                : undefined,
          }
        : undefined,
    };
  } catch {
    return null;
  }
}

/** Fetch AI analysis for a player. Requires parentId for auth. */
export async function getAIAnalysis(
  playerId: string,
  _parentId: string
): Promise<PlayerAIAnalysis | null> {
  if (isDemoMode) {
    return null;
  }

  try {
    const data = await apiFetch<unknown>(`/api/ai-analysis/${playerId}`);
    return normalizeAIAnalysisResponse(data);
  } catch (err) {
    logApiError("playerService.getAIAnalysis", err);
    throw err;
  }
}
