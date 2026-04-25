import { apiFetch } from "@/lib/api";
import { logApiError } from "@/lib/apiErrors";
import { mapApiBookingToBooking, type ApiBooking } from "@/mappers/bookingMapper";
import type { Booking, CreateBookingPayload, PriceBreakdown } from "@/types/booking";

const PARENT_ID_HEADER = "x-parent-id";

/** Fetch bookings for parent. GET /api/bookings with x-parent-id header. */
export async function getBookings(
  parentId: string | undefined | null
): Promise<Booking[]> {
  if (!parentId) return [];
  const data = await apiFetch<ApiBooking[] | unknown>("/api/bookings", {
    headers: { [PARENT_ID_HEADER]: parentId },
  });
  if (!Array.isArray(data)) return [];
  return data.map((item) => mapApiBookingToBooking(item as ApiBooking));
}

/** Calculate price breakdown (platform takes 10% + 150 RUB service fee) */
export function calculatePriceBreakdown(
  coachPrice: number,
  duration: number,
  durationMultiplier: number = 1
): PriceBreakdown {
  const baseAmount = Math.round(coachPrice * (duration / 60) * durationMultiplier);
  const platformFee = Math.round(baseAmount * 0.1);
  const serviceFee = 150;
  const totalAmount = baseAmount + platformFee + serviceFee;
  return {
    coachAmount: baseAmount,
    platformFee,
    serviceFee,
    totalAmount,
    currency: "RUB",
  };
}

export interface CreateBookingResult {
  success: boolean;
  bookingId?: string;
  error?: string;
}

export interface CreatePaymentIntentResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

export interface ConfirmPaymentResult {
  success: boolean;
  booking?: Booking;
  error?: string;
}

/** Create booking (mock or API) */
export async function createBooking(
  payload: CreateBookingPayload,
  parentId?: string | null
): Promise<CreateBookingResult> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (parentId) headers[PARENT_ID_HEADER] = parentId;

    const res = await apiFetch<{ id: string; status: string }>("/api/bookings", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return { success: true, bookingId: res?.id };
  } catch (err) {
    logApiError("bookingService.createBooking", err, "/api/bookings");
    const msg = err instanceof Error ? err.message : "Не удалось создать бронь";
    return { success: false, error: msg };
  }
}

/** Create payment intent (mock or Stripe) */
export async function createPaymentIntent(
  bookingId: string,
  amount: number,
  currency: string,
  parentId?: string | null
): Promise<CreatePaymentIntentResult> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (parentId) headers[PARENT_ID_HEADER] = parentId;

    const res = await apiFetch<{ clientSecret: string; paymentIntentId: string }>(
      "/api/bookings/payment-intent",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ bookingId, amount, currency }),
      }
    );
    return {
      success: true,
      clientSecret: res?.clientSecret,
      paymentIntentId: res?.paymentIntentId,
    };
  } catch (err) {
    logApiError("bookingService.createPaymentIntent", err);
    const msg = err instanceof Error ? err.message : "Не удалось создать платёж";
    return { success: false, error: msg };
  }
}

/** Confirm booking after payment */
export async function confirmBooking(
  bookingId: string,
  paymentIntentId: string,
  parentId?: string | null
): Promise<ConfirmPaymentResult> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (parentId) headers[PARENT_ID_HEADER] = parentId;

    const booking = await apiFetch<Booking>("/api/bookings/confirm", {
      method: "POST",
      headers,
      body: JSON.stringify({ bookingId, paymentIntentId }),
    });
    return { success: true, booking: booking ?? undefined };
  } catch (err) {
    logApiError("bookingService.confirmBooking", err);
    const msg = err instanceof Error ? err.message : "Не удалось подтвердить бронь";
    return { success: false, error: msg };
  }
}

/** Get user bookings */
export async function getMyBookings(parentId?: string | null): Promise<Booking[]> {
  try {
    const headers: Record<string, string> = {};
    if (parentId) headers[PARENT_ID_HEADER] = parentId;

    const data = await apiFetch<Booking[]>("/api/bookings/my", { headers });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    logApiError("bookingService.getMyBookings", err);
    return [];
  }
}
