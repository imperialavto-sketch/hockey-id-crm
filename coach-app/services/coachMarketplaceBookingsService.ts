/**
 * Marketplace slot bookings for the logged-in independent coach.
 * GET /api/marketplace/bookings/coach/me · PATCH /api/marketplace/bookings/[id]
 * POST .../mark-paid · POST .../mark-refunded
 */

import { apiFetch, ApiRequestError, isApi404 } from '@/lib/api';

export type CoachMarketplaceBooking = {
  id: string;
  slotId: string;
  coachId: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  type: string;
  paymentStatus: string;
  paidAt: string | null;
  amountSnapshot: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  parentName: string;
  parentPhone: string;
  playerId: string | null;
  message: string | null;
  createdAt: string;
};

function normalizeRow(raw: unknown): CoachMarketplaceBooking | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : '';
  if (!id) return null;
  const price = typeof o.price === 'number' && Number.isFinite(o.price) ? Math.max(0, Math.floor(o.price)) : 0;
  const snapRaw =
    typeof o.amountSnapshot === 'number' && Number.isFinite(o.amountSnapshot)
      ? o.amountSnapshot
      : price;
  const amountSnapshot = Math.max(0, Math.floor(snapRaw));
  const methodRaw = typeof o.paymentMethod === 'string' ? o.paymentMethod.trim() : '';
  const refRaw =
    typeof o.paymentReference === 'string' ? o.paymentReference.trim() : '';
  return {
    id,
    slotId: typeof o.slotId === 'string' ? o.slotId : '',
    coachId: typeof o.coachId === 'string' ? o.coachId : '',
    status: typeof o.status === 'string' ? o.status : 'pending',
    date: typeof o.date === 'string' ? o.date.slice(0, 10) : '',
    startTime: typeof o.startTime === 'string' ? o.startTime : '',
    endTime: typeof o.endTime === 'string' ? o.endTime : '',
    price,
    type: typeof o.type === 'string' ? o.type : '',
    paymentStatus: typeof o.paymentStatus === 'string' ? o.paymentStatus : 'unpaid',
    paidAt: typeof o.paidAt === 'string' ? o.paidAt : null,
    amountSnapshot,
    paymentMethod: methodRaw.length > 0 ? methodRaw : null,
    paymentReference: refRaw.length > 0 ? refRaw : null,
    parentName: typeof o.parentName === 'string' ? o.parentName : '—',
    parentPhone: typeof o.parentPhone === 'string' ? o.parentPhone : '—',
    playerId: typeof o.playerId === 'string' ? o.playerId : null,
    message: typeof o.message === 'string' ? o.message : null,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : '',
  };
}

export class NoMarketplaceCoachProfileError extends Error {
  constructor() {
    super('NO_MARKETPLACE_PROFILE');
    this.name = 'NoMarketplaceCoachProfileError';
  }
}

export async function fetchCoachMarketplaceBookings(): Promise<CoachMarketplaceBooking[]> {
  try {
    const data = await apiFetch<unknown[]>('/api/marketplace/bookings/coach/me');
    if (!Array.isArray(data)) return [];
    return data.map(normalizeRow).filter((r): r is CoachMarketplaceBooking => r != null);
  } catch (e) {
    if (isApi404(e)) {
      throw new NoMarketplaceCoachProfileError();
    }
    throw e;
  }
}

export async function patchCoachMarketplaceBooking(
  bookingId: string,
  status: 'confirmed' | 'cancelled'
): Promise<CoachMarketplaceBooking> {
  const data = await apiFetch<unknown>(`/api/marketplace/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const row = normalizeRow(data);
  if (!row) {
    throw new ApiRequestError('Некорректный ответ сервера', 500);
  }
  return row;
}

export async function postCoachMarketplaceBookingMarkPaid(
  bookingId: string,
  body?: { paymentMethod?: string; paymentReference?: string }
): Promise<CoachMarketplaceBooking> {
  const data = await apiFetch<unknown>(
    `/api/marketplace/bookings/${bookingId}/mark-paid`,
    {
      method: 'POST',
      body: JSON.stringify({
        paymentMethod: body?.paymentMethod,
        paymentReference: body?.paymentReference,
      }),
    }
  );
  const row = normalizeRow(data);
  if (!row) {
    throw new ApiRequestError('Некорректный ответ сервера', 500);
  }
  return row;
}

export async function postCoachMarketplaceBookingMarkRefunded(
  bookingId: string
): Promise<CoachMarketplaceBooking> {
  const data = await apiFetch<unknown>(
    `/api/marketplace/bookings/${bookingId}/mark-refunded`,
    { method: 'POST', body: JSON.stringify({}) }
  );
  const row = normalizeRow(data);
  if (!row) {
    throw new ApiRequestError('Некорректный ответ сервера', 500);
  }
  return row;
}
