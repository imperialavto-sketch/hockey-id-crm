import type { ScheduleItem } from "@/types";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";
import { mockPlayerSchedule } from "@/mocks/schedule";

/**
 * Demo schedule for Голыш Марк based on existing mockPlayerSchedule.
 */

export function getDemoScheduleForPlayer(playerId: string): ScheduleItem[] {
  return (
    mockPlayerSchedule[playerId] ??
    mockPlayerSchedule[PLAYER_MARK_GOLYSH.id] ??
    mockPlayerSchedule["1"] ??
    []
  );
}

export function getDemoWeeklySchedule(): ScheduleItem[] {
  return getDemoScheduleForPlayer(PLAYER_MARK_GOLYSH.id);
}

