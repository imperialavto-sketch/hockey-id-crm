import type { ScheduleItem } from "@/types";
import type { TeamEvent } from "@/types/team";
import { apiFetch } from "@/lib/api";

/** Backend schedule item from hockey-server */
interface BackendScheduleItem {
  id: number;
  title: string;
  date: string;
  location?: string | null;
  teamId: number;
}

/** Backend player (minimal for teamId) */
interface BackendPlayerRef {
  id: number;
  teamId?: number | null;
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

function mapBackendScheduleToItem(b: BackendScheduleItem): ScheduleItem {
  return {
    id: String(b.id),
    day: formatDay(b.date),
    title: b.title ?? "",
    time: formatTime(b.date),
  };
}

/** Fetch all schedule from backend (GET /api/schedule). */
export async function getSchedule(): Promise<ScheduleItem[]> {
  try {
    const data = await apiFetch<BackendScheduleItem[]>("/api/schedule", { timeoutMs: 6000 });
    if (!Array.isArray(data)) return [];
    return data.map(mapBackendScheduleToItem);
  } catch {
    return [];
  }
}

/** Fetch schedule for a player: get player's teamId, then filter schedule by teamId. */
export async function getPlayerSchedule(
  playerId: string,
  _parentId: string
): Promise<ScheduleItem[]> {
  try {
    const [player, scheduleList] = await Promise.all([
      apiFetch<BackendPlayerRef>(`/api/players/${playerId}`, { timeoutMs: 6000 }),
      apiFetch<BackendScheduleItem[]>("/api/schedule", { timeoutMs: 6000 }),
    ]);
    if (!player?.teamId || !Array.isArray(scheduleList)) return [];
    const forTeam = scheduleList.filter((s) => s.teamId === player.teamId);
    return forTeam.map(mapBackendScheduleToItem);
  } catch {
    return [];
  }
}

/** Fetch schedule from backend and map to TeamEvent[] for team feed "Ближайшие события". */
export async function getTeamEvents(): Promise<TeamEvent[]> {
  try {
    const data = await apiFetch<BackendScheduleItem[]>("/api/schedule", { timeoutMs: 6000 });
    if (!Array.isArray(data)) return [];
    return data
      .slice(0, 10)
      .map((s): TeamEvent => {
        const d = new Date(s.date);
        return {
          id: String(s.id),
          type: "training",
          title: s.title ?? "Событие",
          date: d.toISOString().slice(0, 10),
          time: d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          location: s.location ?? undefined,
        };
      });
  } catch {
    return [];
  }
}
