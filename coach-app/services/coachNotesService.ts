/**
 * Coach Notes service.
 * GET /api/players/[id]/notes — list notes (newest first)
 * POST /api/players/[id]/notes — create note
 * Auth: getCoachAuthHeaders (Bearer; dev without token gets 401).
 */

import { apiFetch, ApiRequestError, isApi404 } from '@/lib/api';
import { getCoachAuthHeaders } from '@/lib/coachAuth';
import { isEndpointUnavailable, markEndpointUnavailable } from '@/lib/endpointAvailability';

export interface CreateCoachNotePayload {
  noteType: string;
  focusTags: string[];
  note: string;
  shareWithParent: boolean;
}

export interface PlayerNoteResponse {
  id: string;
  playerId: string;
  note: string;
  createdAt: string;
}

export interface CoachNoteDisplay {
  id: string;
  date: string;
  text: string;
}

function formatNoteDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function mapToDisplay(raw: PlayerNoteResponse): CoachNoteDisplay {
  return {
    id: raw.id,
    date: formatNoteDate(raw.createdAt),
    text: raw.note,
  };
}

const notesPathPrefix = '/api/players/';

/**
 * Fetch coach notes for a player.
 * GET /api/players/[playerId]/notes
 * Returns [] on 404 (endpoint absent). Empty array on player not found.
 */
export async function getCoachNotes(playerId: string): Promise<CoachNoteDisplay[]> {
  const path = `${notesPathPrefix}${playerId}/notes`;
  if (isEndpointUnavailable(path)) return [];
  try {
    const headers = await getCoachAuthHeaders();
    const raw = await apiFetch<PlayerNoteResponse[]>(path, { method: 'GET', headers });
    const arr = Array.isArray(raw) ? raw : [];
    return arr
      .filter((r): r is PlayerNoteResponse => !!r && typeof r.id === 'string')
      .map(mapToDisplay);
  } catch (e) {
    if (isApi404(e)) {
      markEndpointUnavailable(path);
      return [];
    }
    throw e;
  }
}

function buildNoteText(payload: CreateCoachNotePayload): string {
  const parts: string[] = [];
  if (payload.noteType) {
    const typeLabel =
      payload.noteType === 'practice'
        ? 'Practice'
        : payload.noteType === 'game'
          ? 'Game'
          : payload.noteType === 'development'
            ? 'Development'
            : payload.noteType === 'parent-follow-up'
              ? 'Parent Follow-up'
              : payload.noteType;
    parts.push(`[${typeLabel}]`);
  }
  if (payload.focusTags.length > 0) {
    parts.push(`Focus: ${payload.focusTags.join(', ')}`);
  }
  const main = payload.note.trim();
  if (parts.length > 0 && main) {
    return `${parts.join(' · ')}\n\n${main}`;
  }
  if (parts.length > 0) {
    return parts.join(' · ');
  }
  return main;
}

const notesPostPathPrefix = '/api/players/';

/**
 * Create a coach note for a player.
 * Sends to POST /api/players/[playerId]/notes
 * On 404, throws user-friendly "feature unavailable" error.
 */
export async function createCoachNote(
  playerId: string,
  payload: CreateCoachNotePayload
): Promise<PlayerNoteResponse> {
  const note = buildNoteText(payload);
  if (!note.trim()) {
    throw new ApiRequestError('Текст заметки обязателен', 400);
  }

  const path = `${notesPostPathPrefix}${playerId}/notes`;
  if (isEndpointUnavailable(path)) {
    throw new ApiRequestError('Функция заметок пока недоступна', 404);
  }
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<PlayerNoteResponse>(path, {
      method: 'POST',
      headers,
      body: JSON.stringify({ note: note.trim() }),
    });
    return res;
  } catch (e) {
    if (isApi404(e)) {
      markEndpointUnavailable(path);
      throw new ApiRequestError('Функция заметок пока недоступна', 404);
    }
    throw e;
  }
}
