/**
 * Loads per-player Hockey ID attention preview for schedule session rows.
 * Stub: no aggregate API wired yet — resolves without calling onPlayer (chips stay empty).
 */

import type { CoachHockeyIdAttentionLevel } from "@/lib/coachHockeyIdAttention";

export type LoadScheduleHockeyIdAttentionOptions = {
  signal: AbortSignal;
  concurrency: number;
  onPlayer: (playerId: string, level: CoachHockeyIdAttentionLevel) => void;
};

export async function loadScheduleHockeyIdAttentionPreviews(
  _playerIds: string[],
  options: LoadScheduleHockeyIdAttentionOptions
): Promise<void> {
  if (options.signal.aborted) return;
  // Future: batch fetch previews, respect options.concurrency and options.signal.
}
