/**
 * Marketplace slot booking lifecycle (independent coaches only).
 * Pure rules shared with smoke tests; keep parent-app / coach-app copies in sync.
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

/** Normalize for comparisons; unknown values pass through trimmed lowercase. */
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

export function coachCanConfirmMarketplaceBooking(bookingStatus: string): boolean {
  return normalizeMarketplaceBookingStatus(bookingStatus) === MARKETPLACE_BOOKING_STATUS.PENDING;
}

export function coachCanCancelMarketplaceBooking(bookingStatus: string): boolean {
  const s = normalizeMarketplaceBookingStatus(bookingStatus);
  return (
    s === MARKETPLACE_BOOKING_STATUS.PENDING || s === MARKETPLACE_BOOKING_STATUS.CONFIRMED
  );
}

/** Same rules as coach cancel (parent PATCH cancelled). */
export function parentCanCancelMarketplaceBooking(bookingStatus: string): boolean {
  return coachCanCancelMarketplaceBooking(bookingStatus);
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

export type CoachMarketplaceBookingActionMatrix = {
  canConfirm: boolean;
  canCancel: boolean;
  canMarkPaid: boolean;
  canMarkRefunded: boolean;
};

export function getCoachMarketplaceBookingActions(booking: {
  status: string;
  paymentStatus: string;
}): CoachMarketplaceBookingActionMatrix {
  return {
    canConfirm: coachCanConfirmMarketplaceBooking(booking.status),
    canCancel: coachCanCancelMarketplaceBooking(booking.status),
    canMarkPaid: marketplaceBookingAllowsMarkPaid(booking),
    canMarkRefunded: marketplaceBookingAllowsMarkRefunded(booking.paymentStatus),
  };
}
