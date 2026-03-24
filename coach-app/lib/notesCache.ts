/**
 * Recently saved coach notes — optimistic display after Add Note.
 * Player Hub merges these with API/mock data on focus.
 * Dedupe: cache notes with id already in baseNotes are skipped (avoids duplicates
 * when API has caught up and returned the same note).
 */

export interface CachedNote {
  id: string;
  date: string;
  text: string;
}

const cache: Record<string, CachedNote[]> = {};

export function addRecentlySavedNote(playerId: string, note: CachedNote): void {
  if (!cache[playerId]) cache[playerId] = [];
  cache[playerId] = [note, ...cache[playerId]];
}

export function getRecentlySavedNotes(playerId: string): CachedNote[] {
  return cache[playerId] ?? [];
}

/**
 * Merge base notes (from API or mock) with recently saved cache.
 * Dedupes by id: cache notes already present in baseNotes are skipped.
 */
export function mergeNotesWithCache(
  baseNotes: Array<{ id: string; date: string; text: string }>,
  playerId: string
): Array<{ id: string; date: string; text: string }> {
  const recent = getRecentlySavedNotes(playerId);
  if (recent.length === 0) return baseNotes;
  const seen = new Set(baseNotes.map((n) => n.id));
  const prepended = recent.filter((n) => !seen.has(n.id));
  return [...prepended, ...baseNotes];
}
