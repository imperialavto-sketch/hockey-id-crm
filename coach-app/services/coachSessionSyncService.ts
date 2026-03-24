/**
 * Coach Session Sync service.
 * POST /api/coach/sessions/sync — sync completed session bundle to backend.
 * Auth: getCoachAuthHeaders (Bearer; dev without token gets 401).
 */

import { apiFetch, ApiRequestError, isApi404 } from '@/lib/api';
import { getCoachAuthHeaders } from '@/lib/coachAuth';
import { isEndpointUnavailable, markEndpointUnavailable } from '@/lib/endpointAvailability';
import type { CoachSessionBundlePayload } from '@/models/coachSessionSync';

export interface SyncSessionResponse {
  sessionId?: string;
  syncedAt?: string;
}

const SYNC_PATH = '/api/coach/sessions/sync';

/**
 * Sync a completed coach session bundle to the backend.
 * On 404 (endpoint absent), throws so UI shows "failed" — do not fake success.
 */
export async function syncCoachSessionBundle(
  payload: CoachSessionBundlePayload
): Promise<SyncSessionResponse> {
  if (isEndpointUnavailable(SYNC_PATH)) {
    throw new ApiRequestError('Синхронизация пока недоступна', 404);
  }
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<SyncSessionResponse>(SYNC_PATH, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return res ?? {};
  } catch (e) {
    if (isApi404(e)) {
      markEndpointUnavailable(SYNC_PATH);
      throw new ApiRequestError('Синхронизация пока недоступна', 404);
    }
    throw e;
  }
}

export { ApiRequestError };
