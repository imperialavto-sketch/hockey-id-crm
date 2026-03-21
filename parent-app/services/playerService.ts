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

/** Backend (hockey-server) player response shape */
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
}

/** Backend playerStat row shape from GET /api/players/:id/stats */
interface BackendPlayerStat {
  games?: number | null;
  goals?: number | null;
  assists?: number | null;
  points?: number | null;
  pim?: number | null;
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
): Promise<{ player: Player | null; statsFallback: PlayerStats | null }> {
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
      };
    }
    throw error;
  }

  if (data && typeof data === "object" && data.id != null) {
    return {
      player: mapApiPlayerToPlayer(mapBackendPlayerToApiPlayer(data)),
      statsFallback: getStatsFallbackFromBackendPlayer(data),
    };
  }

  return {
    player: null,
    statsFallback: null,
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
}

const MOCK_FULL_PROFILE: FullPlayerProfile = {
  player: mockPlayers[0],
  stats: mockPlayerStats[PLAYER_MARK_GOLYSH.id] ?? mockPlayerStats["1"] ?? null,
  schedule: mockPlayerSchedule[PLAYER_MARK_GOLYSH.id] ?? mockPlayerSchedule["1"] ?? [],
  recommendations: mockRecommendations[PLAYER_MARK_GOLYSH.id] ?? mockRecommendations["1"] ?? [],
  progressHistory: [],
  achievements: { unlocked: [], locked: [] },
  videoAnalyses: [],
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

  const { player, statsFallback } = playerResult.value;
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
  if (__DEV__) {
    console.log("PLAYERS API RESULT", data);
  }
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
