import type { Player, PlayerStats, Recommendation, PlayerAIAnalysis, ScheduleItem, PlayerVideoAnalysis } from "@/types";
import type { PlayerProgressSnapshot, AchievementsResponse } from "@/types";
import { apiFetch } from "@/lib/api";
import { mapApiPlayerToPlayer, type ApiPlayer } from "@/mappers/playerMapper";
import { mapApiStatsToPlayerStats, type ApiStats } from "@/mappers/statsMapper";
import { mapApiRecommendation, type ApiRecommendation } from "@/mappers/recommendationMapper";
import { mapApiScheduleItem, type ApiScheduleItem } from "@/mappers/scheduleMapper";
import { isDev } from "@/config/api";
import { logApiError } from "@/lib/apiErrors";
import { mockPlayers } from "@/mocks/players";
import { mockPlayerStats } from "@/mocks/stats";
import { mockRecommendations } from "@/mocks/recommendations";
import { mockPlayerSchedule } from "@/mocks/schedule";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";
import { getPlayerSchedule } from "@/services/scheduleService";

const PARENT_ID_HEADER = "x-parent-id";

/** Backend (hockey-server) player response shape */
interface BackendPlayer {
  id: number;
  firstName: string;
  lastName: string;
  birthYear: number;
  position?: string | null;
  parentId: number;
  teamId?: number | null;
  team?: { name: string } | null;
}

function mapBackendPlayerToApiPlayer(b: BackendPlayer): ApiPlayer {
  return {
    id: String(b.id),
    firstName: b.firstName,
    lastName: b.lastName,
    birthYear: b.birthYear,
    position: b.position ?? undefined,
    team: b.team?.name ?? "",
  };
}

/** Mock fallback only in DEV. PROD: throw so UI shows error state. */
function useMockFallback<T>(fallback: () => T, err: unknown): T {
  logApiError("playerService", err);
  if (isDev) {
    try {
      return fallback();
    } catch (fallbackErr) {
      logApiError("playerService.useMockFallback", fallbackErr);
      throw fallbackErr;
    }
  }
  throw err;
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

/** Fetch full player profile from backend: getPlayer + getPlayerSchedule. */
export async function getFullPlayerProfile(
  playerId: string,
  parentId: string,
  _options?: { includeVideoAnalyses?: boolean }
): Promise<FullPlayerProfile | null> {
  try {
    const [player, schedule] = await Promise.all([
      getPlayerById(playerId, parentId),
      getPlayerSchedule(playerId, parentId),
    ]);
    if (!player) return null;
    return {
      player,
      stats: null,
      schedule,
      recommendations: [],
      progressHistory: [],
      achievements: { unlocked: [], locked: [] },
      videoAnalyses: [],
    };
  } catch (err) {
    logApiError("playerService.getFullPlayerProfile", err);
    if (isDev) return MOCK_FULL_PROFILE;
    throw err;
  }
}

/** TEMPORARY: Fallback when API fails (e.g. backend not running, no network). */
function useFallbackPlayer(): Player[] {
  return [...mockPlayers];
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

/** Fetch players from backend (GET /api/players), filtered by parent. */
export async function getPlayers(parentId: string): Promise<Player[]> {
  try {
    const data = await apiFetch<BackendPlayer[]>("/api/players", {
      timeoutMs: 6000,
    });
    if (!Array.isArray(data)) return useMockFallback(useFallbackPlayer, new Error("Invalid response"));
    const parentIdNum = parseInt(String(parentId), 10);
    const forParent = Number.isNaN(parentIdNum)
      ? data
      : data.filter((p) => p.parentId === parentIdNum);
    return forParent.map((p) => mapApiPlayerToPlayer(mapBackendPlayerToApiPlayer(p)));
  } catch (err) {
    return useMockFallback(useFallbackPlayer, err);
  }
}

/** Fetch single player from backend (GET /api/players/:id). */
export async function getPlayerById(id: string, _parentId?: string): Promise<Player | null> {
  try {
    const data = await apiFetch<BackendPlayer>(`/api/players/${id}`, { timeoutMs: 6000 });
    if (data && typeof data === "object" && data.id != null) {
      return mapApiPlayerToPlayer(mapBackendPlayerToApiPlayer(data));
    }
    return null;
  } catch (err) {
    return useMockFallback(() => useFallbackPlayerById(id), err);
  }
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

/** Fetch player stats. Requires parentId for auth. */
export async function getPlayerStats(
  playerId: string,
  parentId: string
): Promise<PlayerStats | null> {
  try {
    const data = await apiFetch<ApiStats | null>(
      `/api/parent/mobile/player/${playerId}/stats`,
      { headers: { [PARENT_ID_HEADER]: parentId } }
    );
    if (data && typeof data === "object") {
      return mapApiStatsToPlayerStats(data);
    }
    return null;
  } catch (err) {
    return useMockFallback(() => useFallbackStats(playerId), err);
  }
}

/** Fetch coach recommendations. Requires parentId for auth. */
export async function getCoachRecommendations(
  playerId: string,
  parentId: string
): Promise<Recommendation[]> {
  try {
    const data = await apiFetch<ApiRecommendation[]>(
      `/api/parent/mobile/player/${playerId}/recommendations`,
      { headers: { [PARENT_ID_HEADER]: parentId } }
    );
    if (Array.isArray(data)) {
      return data.map(mapApiRecommendation).filter((r) => r.text);
    }
  } catch (err) {
    return useMockFallback(() => useFallbackRecommendations(playerId), err);
  }
}

/** Fetch AI analysis for a player. Requires parentId for auth. */
export async function getAIAnalysis(
  playerId: string,
  parentId: string
): Promise<PlayerAIAnalysis | null> {
  try {
    const data = await apiFetch<PlayerAIAnalysis>(
      `/api/player/${playerId}/ai-analysis`,
      { headers: { [PARENT_ID_HEADER]: parentId } }
    );
    if (data && typeof data === "object" && typeof data.summary === "string") {
      return data;
    }
  } catch (err) {
    logApiError("playerService.getAIAnalysis", err);
    if (isDev) return null;
    throw err;
  }
}
