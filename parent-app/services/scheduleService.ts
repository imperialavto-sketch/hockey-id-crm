import type { ScheduleItem } from "@/types";
import type { TeamEvent } from "@/types/team";
import { apiFetch } from "@/lib/api";
import { withFallback } from "@/utils/withFallback";
import { getDemoScheduleForPlayer, getDemoWeeklySchedule } from "@/demo/demoSchedule";
import { MOCK_TEAM_EVENTS } from "@/constants/mockTeamEvents";

/** Backend training row shape from GET /api/schedule */
interface BackendTraining {
  id: string;
  title: string | null;
  startTime?: string;
  date?: string;
  location?: string | null;
  teamId: string;
}

/** Backend player (minimal for teamId) */
interface BackendPlayerRef {
  id: string;
  teamId?: string | null;
}

function formatDay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function mapBackendTrainingToItem(t: BackendTraining): ScheduleItem {
  const rawStart = t.startTime ?? t.date ?? "";
  return {
    id: t.id,
    day: formatDay(rawStart),
    title: t.title ?? "",
    time: formatTime(rawStart),
  };
}

/** Fetch all schedule from backend (GET /api/schedule) with demo fallback. */
export async function getSchedule(): Promise<ScheduleItem[]> {
  return withFallback(
    async () => {
      const data = await apiFetch<BackendTraining[]>("/api/schedule", { timeoutMs: 6000 });
      if (!Array.isArray(data)) return [];
      return data.map(mapBackendTrainingToItem);
    },
    async () => getDemoWeeklySchedule()
  );
}

/** Fetch schedule for a player: get player's teamId, then filter schedule by teamId, with demo fallback. */
export async function getPlayerSchedule(
  playerId: string,
  _parentId: string
): Promise<ScheduleItem[]> {
  return withFallback(
    async () => {
      const [player, scheduleList] = await Promise.all([
        apiFetch<BackendPlayerRef>(`/api/me/players/${playerId}`, { timeoutMs: 6000 }),
        apiFetch<BackendTraining[]>("/api/schedule", { timeoutMs: 6000 }),
      ]);
      if (!Array.isArray(scheduleList)) return [];
      if (player?.teamId) {
        const forTeam = scheduleList.filter((s) => s.teamId === player.teamId);
        return forTeam.map(mapBackendTrainingToItem);
      }
      return scheduleList.map(mapBackendTrainingToItem);
    },
    async () => getDemoScheduleForPlayer(playerId)
  );
}

/** Fetch schedule from backend and map to TeamEvent[] for team feed "Ближайшие события", with demo fallback. */
export async function getTeamEvents(): Promise<TeamEvent[]> {
  return withFallback(
    async () => {
      const data = await apiFetch<BackendTraining[]>("/api/schedule", { timeoutMs: 6000 });
      if (!Array.isArray(data)) return [];
      return data
        .slice(0, 10)
        .map((s): TeamEvent => {
          const rawStart = s.startTime ?? s.date ?? "";
          const d = new Date(rawStart);
          return {
            id: s.id,
            type: "training",
            title: s.title ?? "Событие",
            date: d.toISOString().slice(0, 10),
            time: d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
            location: s.location ?? undefined,
          };
        });
    },
    async () => [...MOCK_TEAM_EVENTS]
  );
}

