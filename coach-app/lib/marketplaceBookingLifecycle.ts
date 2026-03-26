/**
 * Marketplace booking lifecycle rules + coach-facing RU copy.
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

export function coachCanConfirmMarketplaceBooking(bookingStatus: string): boolean {
  return normalizeMarketplaceBookingStatus(bookingStatus) === MARKETPLACE_BOOKING_STATUS.PENDING;
}

export function coachCanCancelMarketplaceBooking(bookingStatus: string): boolean {
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

const BOOKING_LABEL_RU: Record<string, string> = {
  pending: "Ожидает вашего подтверждения",
  confirmed: "Вы подтвердили бронь",
  cancelled: "Бронь отменена",
};

const PAYMENT_LABEL_RU: Record<string, string> = {
  unpaid: "Не оплачено",
  pending: "Ожидает оплаты",
  paid: "Оплачено",
  refunded: "Возврат оформлен",
  failed: "Ошибка оплаты",
};

export function coachBookingStatusLabelRu(status: string): string {
  const s = normalizeMarketplaceBookingStatus(status);
  return BOOKING_LABEL_RU[s] ?? `Бронь: ${s || "?"}`;
}

export function coachPaymentStatusLabelRu(paymentStatus: string): string {
  const p = normalizeMarketplacePaymentStatus(paymentStatus);
  return PAYMENT_LABEL_RU[p] ?? `Оплата: ${p}`;
}

/** Compact line for list rows */
export function coachListBookingStatusShortRu(status: string): string {
  const s = normalizeMarketplaceBookingStatus(status);
  if (s === MARKETPLACE_BOOKING_STATUS.PENDING) return "Ждёт вас";
  if (s === MARKETPLACE_BOOKING_STATUS.CONFIRMED) return "Активна";
  if (s === MARKETPLACE_BOOKING_STATUS.CANCELLED) return "Отменена";
  return s ? s.slice(0, 14) : "—";
}

export function coachListPaymentShortRu(paymentStatus: string): string {
  const p = normalizeMarketplacePaymentStatus(paymentStatus);
  const map: Record<string, string> = {
    unpaid: "Не оплач.",
    pending: "Оплата…",
    paid: "Оплачено",
    refunded: "Возврат",
    failed: "Ошибка",
  };
  return map[p] ?? `Опл.: ${p.slice(0, 8)}`;
}

export function coachDetailCompletedLines(booking: {
  status: string;
  paymentStatus: string;
}): string[] {
  const s = normalizeMarketplaceBookingStatus(booking.status);
  const p = normalizeMarketplacePaymentStatus(booking.paymentStatus);
  const lines: string[] = [];
  if (s === MARKETPLACE_BOOKING_STATUS.CONFIRMED) {
    lines.push("Бронь подтверждена — родитель видит активную запись.");
  }
  if (s === MARKETPLACE_BOOKING_STATUS.CANCELLED) {
    lines.push("Бронь отменена, слот снова доступен в расписании.");
  }
  if (p === MARKETPLACE_PAYMENT_STATUS.PAID) {
    lines.push("Оплата отмечена как полученная.");
  }
  if (p === MARKETPLACE_PAYMENT_STATUS.REFUNDED) {
    lines.push("По оплате зафиксирован возврат.");
  }
  return lines;
}

export function coachDetailUnavailableNotes(
  booking: { status: string; paymentStatus: string },
  actions: CoachMarketplaceBookingActionMatrix
): string[] {
  const anyAction =
    actions.canConfirm ||
    actions.canCancel ||
    actions.canMarkPaid ||
    actions.canMarkRefunded;
  if (anyAction) return [];

  const s = normalizeMarketplaceBookingStatus(booking.status);
  const p = normalizeMarketplacePaymentStatus(booking.paymentStatus);
  const lines: string[] = [];
  if (s === MARKETPLACE_BOOKING_STATUS.CANCELLED && p === MARKETPLACE_PAYMENT_STATUS.UNPAID) {
    lines.push("Дополнительных действий не требуется.");
  } else if (
    s === MARKETPLACE_BOOKING_STATUS.CONFIRMED &&
    p === MARKETPLACE_PAYMENT_STATUS.REFUNDED
  ) {
    lines.push("Бронь остаётся подтверждённой; оплата помечена как возврат.");
  } else if (s === MARKETPLACE_BOOKING_STATUS.CANCELLED && p === MARKETPLACE_PAYMENT_STATUS.REFUNDED) {
    lines.push("Бронь отменена; возврат оплаты уже отмечен.");
  } else {
    lines.push("Сейчас нет доступных действий для этой записи.");
  }
  return lines;
}
