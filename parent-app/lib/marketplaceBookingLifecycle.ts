/**
 * Marketplace booking lifecycle rules + parent-facing RU copy.
 * Keep domain logic aligned with: src/lib/marketplace-booking-lifecycle.ts
 */

export const MARKETPLACE_BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
} as const;

export const MARKETPLACE_PAYMENT_STATUS = {
  UNPAID: "unpaid",
  PENDING: "pending",
  PAID: "paid",
  REFUNDED: "refunded",
  FAILED: "failed",
} as const;

const PAYMENT_STATUSES_ALLOWED_TO_MARK_PAID = new Set<string>([
  MARKETPLACE_PAYMENT_STATUS.UNPAID,
  MARKETPLACE_PAYMENT_STATUS.PENDING,
  MARKETPLACE_PAYMENT_STATUS.FAILED,
]);

const KNOWN_BOOKING = new Set<string>([
  MARKETPLACE_BOOKING_STATUS.PENDING,
  MARKETPLACE_BOOKING_STATUS.CONFIRMED,
  MARKETPLACE_BOOKING_STATUS.CANCELLED,
]);

export function normalizeMarketplaceBookingStatus(raw: string): string {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (KNOWN_BOOKING.has(s)) return s;
  return s || MARKETPLACE_BOOKING_STATUS.PENDING;
}

export function normalizeMarketplacePaymentStatus(raw: string): string {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return MARKETPLACE_PAYMENT_STATUS.UNPAID;
  return s;
}

export function parentCanCancelMarketplaceBooking(bookingStatus: string): boolean {
  const s = normalizeMarketplaceBookingStatus(bookingStatus);
  return (
    s === MARKETPLACE_BOOKING_STATUS.PENDING || s === MARKETPLACE_BOOKING_STATUS.CONFIRMED
  );
}

export function marketplaceBookingAllowsMarkPaid(booking: {
  status: string;
  paymentStatus: string;
}): boolean {
  return (
    normalizeMarketplaceBookingStatus(booking.status) ===
      MARKETPLACE_BOOKING_STATUS.CONFIRMED &&
    PAYMENT_STATUSES_ALLOWED_TO_MARK_PAID.has(
      normalizeMarketplacePaymentStatus(booking.paymentStatus)
    )
  );
}

export function marketplaceBookingAllowsMarkRefunded(paymentStatus: string): boolean {
  return (
    normalizeMarketplacePaymentStatus(paymentStatus) === MARKETPLACE_PAYMENT_STATUS.PAID
  );
}

const BOOKING_LABEL_RU: Record<string, string> = {
  pending: "Ожидает подтверждения тренера",
  confirmed: "Тренер подтвердил бронь",
  cancelled: "Бронь отменена",
};

const PAYMENT_LABEL_RU: Record<string, string> = {
  unpaid: "Оплата: не получена",
  pending: "Оплата: в процессе",
  paid: "Оплата: получена",
  refunded: "Оплата: возврат",
  failed: "Оплата: ошибка",
};

export function parentBookingStatusLabelRu(status: string): string {
  const s = normalizeMarketplaceBookingStatus(status);
  return BOOKING_LABEL_RU[s] ?? `Статус брони: ${s || "неизвестно"}`;
}

export function parentPaymentStatusLabelRu(paymentStatus: string): string {
  const p = normalizeMarketplacePaymentStatus(paymentStatus);
  return PAYMENT_LABEL_RU[p] ?? `Статус оплаты: ${p}`;
}

/**
 * Short cross-hint for edge cases (e.g. cancelled but money was taken).
 */
export function parentMarketplaceBookingCrossHint(booking: {
  status: string;
  paymentStatus: string;
}): string | null {
  const s = normalizeMarketplaceBookingStatus(booking.status);
  const p = normalizeMarketplacePaymentStatus(booking.paymentStatus);
  if (s === MARKETPLACE_BOOKING_STATUS.CANCELLED && p === MARKETPLACE_PAYMENT_STATUS.PAID) {
    return "Бронь отменена, но оплата была отмечена — уточните возврат напрямую с тренером.";
  }
  if (s === MARKETPLACE_BOOKING_STATUS.CANCELLED && p === MARKETPLACE_PAYMENT_STATUS.REFUNDED) {
    return "Бронь отменена; по оплате зафиксирован возврат.";
  }
  if (s === MARKETPLACE_BOOKING_STATUS.CANCELLED && p === MARKETPLACE_PAYMENT_STATUS.UNPAID) {
    return null;
  }
  return null;
}

export type ParentPaymentPillTone =
  | "paid"
  | "refunded"
  | "failed"
  | "pending"
  | "unpaid"
  | "unknown";

export function parentPaymentPillTone(paymentStatus: string): ParentPaymentPillTone {
  const p = normalizeMarketplacePaymentStatus(paymentStatus);
  if (p === MARKETPLACE_PAYMENT_STATUS.PAID) return "paid";
  if (p === MARKETPLACE_PAYMENT_STATUS.REFUNDED) return "refunded";
  if (p === MARKETPLACE_PAYMENT_STATUS.FAILED) return "failed";
  if (p === MARKETPLACE_PAYMENT_STATUS.PENDING) return "pending";
  if (p === MARKETPLACE_PAYMENT_STATUS.UNPAID) return "unpaid";
  return "unknown";
}

export function parentBookingPillTone(status: string): "pending" | "confirmed" | "cancelled" | "unknown" {
  const s = normalizeMarketplaceBookingStatus(status);
  if (s === MARKETPLACE_BOOKING_STATUS.PENDING) return "pending";
  if (s === MARKETPLACE_BOOKING_STATUS.CONFIRMED) return "confirmed";
  if (s === MARKETPLACE_BOOKING_STATUS.CANCELLED) return "cancelled";
  return "unknown";
}
