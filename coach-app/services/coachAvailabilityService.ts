/**
 * Marketplace availability for the logged-in independent coach.
 * GET /api/availability/me · POST /api/availability · PATCH/DELETE /api/availability/[id]
 */

import { apiFetch, ApiRequestError, isApi404 } from '@/lib/api';

export type CoachAvailabilitySlot = {
  id: string;
  coachId: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  type: string;
  isBooked: boolean;
};

export class NoMarketplaceCoachProfileError extends Error {
  constructor() {
    super('NO_MARKETPLACE_PROFILE');
    this.name = 'NoMarketplaceCoachProfileError';
  }
}

function normalizeSlot(raw: unknown): CoachAvailabilitySlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : '';
  if (!id) return null;
  return {
    id,
    coachId: typeof o.coachId === 'string' ? o.coachId : '',
    date: typeof o.date === 'string' ? o.date.slice(0, 10) : '',
    startTime: typeof o.startTime === 'string' ? o.startTime : '',
    endTime: typeof o.endTime === 'string' ? o.endTime : '',
    price: typeof o.price === 'number' && Number.isFinite(o.price) ? o.price : 0,
    type: typeof o.type === 'string' ? o.type : 'ice',
    isBooked: o.isBooked === true,
  };
}

export async function fetchMyMarketplaceAvailability(): Promise<CoachAvailabilitySlot[]> {
  try {
    const data = await apiFetch<unknown[]>('/api/availability/me');
    if (!Array.isArray(data)) return [];
    return data.map(normalizeSlot).filter((s): s is CoachAvailabilitySlot => s != null);
  } catch (e) {
    if (isApi404(e)) {
      throw new NoMarketplaceCoachProfileError();
    }
    throw e;
  }
}

export type CreateAvailabilityPayload = {
  date: string;
  startTime: string;
  endTime: string;
  type: 'ice' | 'gym' | 'private';
  price: number;
};

export async function createMarketplaceAvailability(
  payload: CreateAvailabilityPayload
): Promise<CoachAvailabilitySlot> {
  const data = await apiFetch<unknown>('/api/availability', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const slot = normalizeSlot(data);
  if (!slot) {
    throw new ApiRequestError('Некорректный ответ сервера', 500);
  }
  return slot;
}

export type PatchAvailabilityPayload = Partial<{
  date: string;
  startTime: string;
  endTime: string;
  type: 'ice' | 'gym' | 'private';
  price: number;
}>;

export async function patchMarketplaceAvailability(
  slotId: string,
  payload: PatchAvailabilityPayload
): Promise<CoachAvailabilitySlot> {
  const data = await apiFetch<unknown>(`/api/availability/${slotId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const slot = normalizeSlot(data);
  if (!slot) {
    throw new ApiRequestError('Некорректный ответ сервера', 500);
  }
  return slot;
}

export async function deleteMarketplaceAvailability(slotId: string): Promise<void> {
  await apiFetch<{ ok?: boolean }>(`/api/availability/${slotId}`, {
    method: 'DELETE',
  });
}
