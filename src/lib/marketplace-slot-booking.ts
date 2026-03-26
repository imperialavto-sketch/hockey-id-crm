import type {
  CoachAvailability,
  MarketplaceSlotBooking,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ApiUser } from "@/lib/api-auth";
import {
  MARKETPLACE_BOOKING_STATUS,
  MARKETPLACE_PAYMENT_STATUS,
  marketplaceBookingAllowsMarkPaid,
  marketplaceBookingAllowsMarkRefunded,
  normalizeMarketplaceBookingStatus,
  normalizeMarketplacePaymentStatus,
} from "@/lib/marketplace-booking-lifecycle";

export {
  MARKETPLACE_BOOKING_STATUS,
  MARKETPLACE_PAYMENT_STATUS,
  marketplaceBookingAllowsMarkPaid,
  marketplaceBookingAllowsMarkRefunded,
} from "@/lib/marketplace-booking-lifecycle";

/** Max length for optional payment metadata (manual entry / future provider ids). */
export const MARKETPLACE_PAYMENT_FIELD_MAX_LEN = 256;

export type MarketplaceInvalidPaymentReason =
  | "BOOKING_NOT_CONFIRMED"
  | "PAYMENT_STATUS_NOT_MARKABLE"
  | "NOT_PAID_FOR_REFUND";

function normalizePaymentInput(
  value: string | null | undefined,
  maxLen: number
): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function normalizeStoredOptionalString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t.length > 0 ? t : null;
}

/** Stable key for listing/creating bookings as a parent (mobile + demo sessions). */
export function marketplaceParentBookerId(user: ApiUser): string {
  return user.parentId ?? user.id;
}

export type MarketplaceBookingPaymentPublic = {
  paymentStatus: string;
  paidAt: string | null;
  /** Amount agreed at booking time (same unit as slot price). */
  amountSnapshot: number;
  paymentMethod: string | null;
};

export type MarketplaceBookingPublic = {
  id: string;
  slotId: string;
  coachId: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  type: string;
} & MarketplaceBookingPaymentPublic;

function effectiveAmountSnapshot(
  booking: MarketplaceSlotBooking,
  slot: CoachAvailability
): number {
  const fromBooking = booking.amountSnapshot;
  const fromSlot = slot.price;
  const n =
    typeof fromBooking === "number" && Number.isFinite(fromBooking)
      ? fromBooking
      : typeof fromSlot === "number" && Number.isFinite(fromSlot)
        ? fromSlot
        : 0;
  return Math.max(0, Math.floor(n));
}

function paymentFieldsPublic(
  booking: MarketplaceSlotBooking,
  slot: CoachAvailability
): MarketplaceBookingPaymentPublic {
  return {
    paymentStatus: normalizeMarketplacePaymentStatus(
      booking.paymentStatus ?? ""
    ),
    paidAt: booking.paidAt ? booking.paidAt.toISOString() : null,
    amountSnapshot: effectiveAmountSnapshot(booking, slot),
    paymentMethod: normalizeStoredOptionalString(booking.paymentMethod),
  };
}

export function serializeMarketplaceBooking(
  booking: MarketplaceSlotBooking & { slot: CoachAvailability }
): MarketplaceBookingPublic {
  return {
    id: booking.id,
    slotId: booking.slotId,
    coachId: booking.coachId,
    status: booking.status,
    date: booking.slot.date.toISOString().slice(0, 10),
    startTime: booking.slot.startTime,
    endTime: booking.slot.endTime,
    price: booking.slot.price,
    type: booking.slot.type,
    ...paymentFieldsPublic(booking, booking.slot),
  };
}

/** Coach-only list/detail: contact + slot context + provider reference (marketplace contour). */
export type MarketplaceBookingCoachView = MarketplaceBookingPublic & {
  paymentReference: string | null;
  parentName: string;
  parentPhone: string;
  playerId: string | null;
  message: string | null;
  createdAt: string;
};

export function serializeMarketplaceBookingForCoach(
  booking: MarketplaceSlotBooking & { slot: CoachAvailability }
): MarketplaceBookingCoachView {
  return {
    ...serializeMarketplaceBooking(booking),
    paymentReference: normalizeStoredOptionalString(booking.paymentReference),
    parentName: booking.parentName,
    parentPhone: booking.parentPhone,
    playerId: booking.playerId ?? null,
    message: booking.message ?? null,
    createdAt: booking.createdAt.toISOString(),
  };
}

type CreateResult =
  | { ok: true; booking: MarketplaceSlotBooking & { slot: CoachAvailability } }
  | { ok: false; code: "NOT_FOUND" | "SLOT_TAKEN" | "NOT_INDEPENDENT" | "COACH_MISMATCH" };

export async function createMarketplaceSlotBooking(params: {
  slotId: string;
  coachId?: string;
  bookerUserId: string;
  parentName: string;
  parentPhone: string;
  playerId?: string | null;
  message?: string | null;
}): Promise<CreateResult> {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.coachAvailability.findUnique({
      where: { id: params.slotId },
    });
    if (!slot) return { ok: false, code: "NOT_FOUND" };
    if (slot.isBooked) return { ok: false, code: "SLOT_TAKEN" };

    const coach = await tx.coach.findFirst({
      where: { id: slot.coachId, isMarketplaceIndependent: true },
      select: { id: true },
    });
    if (!coach) return { ok: false, code: "NOT_INDEPENDENT" };

    if (params.coachId && params.coachId !== slot.coachId) {
      return { ok: false, code: "COACH_MISMATCH" };
    }

    const claimed = await tx.coachAvailability.updateMany({
      where: { id: slot.id, isBooked: false },
      data: { isBooked: true },
    });
    if (claimed.count !== 1) {
      return { ok: false, code: "SLOT_TAKEN" };
    }

    const booking = await tx.marketplaceSlotBooking.create({
      data: {
        slotId: slot.id,
        coachId: slot.coachId,
        bookerUserId: params.bookerUserId,
        status: MARKETPLACE_BOOKING_STATUS.PENDING,
        parentName: params.parentName,
        parentPhone: params.parentPhone,
        playerId: params.playerId ?? undefined,
        message: params.message?.trim() ? params.message.trim() : undefined,
        paymentStatus: MARKETPLACE_PAYMENT_STATUS.UNPAID,
        amountSnapshot: slot.price,
      },
      include: { slot: true },
    });

    return { ok: true, booking };
  });
}

async function coachOwnsMarketplaceBooking(
  tx: Prisma.TransactionClient,
  userId: string,
  bookingCoachId: string
): Promise<boolean> {
  const row = await tx.coach.findFirst({
    where: {
      linkedUserId: userId,
      id: bookingCoachId,
      isMarketplaceIndependent: true,
    },
    select: { id: true },
  });
  return !!row;
}

type PatchResult =
  | { ok: true; booking: MarketplaceSlotBooking & { slot: CoachAvailability } }
  | {
      ok: false;
      code: "NOT_FOUND" | "FORBIDDEN" | "INVALID_TRANSITION";
    };

export async function patchMarketplaceSlotBooking(params: {
  bookingId: string;
  user: ApiUser;
  nextStatus: "confirmed" | "cancelled";
}): Promise<PatchResult> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.marketplaceSlotBooking.findUnique({
      where: { id: params.bookingId },
      include: { slot: true },
    });
    if (!booking) return { ok: false, code: "NOT_FOUND" };

    const bookingStatusNorm = normalizeMarketplaceBookingStatus(booking.status);

    const isBooker =
      params.user.role === "PARENT" &&
      marketplaceParentBookerId(params.user) === booking.bookerUserId;
    const isCoach =
      (params.user.role === "COACH" || params.user.role === "MAIN_COACH") &&
      (await coachOwnsMarketplaceBooking(tx, params.user.id, booking.coachId));

    if (params.nextStatus === "confirmed") {
      if (!isCoach) return { ok: false, code: "FORBIDDEN" };
      if (bookingStatusNorm !== MARKETPLACE_BOOKING_STATUS.PENDING) {
        return { ok: false, code: "INVALID_TRANSITION" };
      }
      const updated = await tx.marketplaceSlotBooking.update({
        where: { id: booking.id },
        data: { status: MARKETPLACE_BOOKING_STATUS.CONFIRMED },
        include: { slot: true },
      });
      return { ok: true, booking: updated };
    }

    if (params.nextStatus === "cancelled") {
      if (!isBooker && !isCoach) return { ok: false, code: "FORBIDDEN" };
      if (bookingStatusNorm === MARKETPLACE_BOOKING_STATUS.CANCELLED) {
        return { ok: false, code: "INVALID_TRANSITION" };
      }
      const updated = await tx.marketplaceSlotBooking.update({
        where: { id: booking.id },
        data: { status: MARKETPLACE_BOOKING_STATUS.CANCELLED },
        include: { slot: true },
      });
      await tx.coachAvailability.updateMany({
        where: { id: booking.slotId },
        data: { isBooked: false },
      });
      return { ok: true, booking: updated };
    }

    return { ok: false, code: "INVALID_TRANSITION" };
  });
}

type PaymentMutationResult =
  | { ok: true; booking: MarketplaceSlotBooking & { slot: CoachAvailability } }
  | {
      ok: false;
      code: "NOT_FOUND" | "FORBIDDEN" | "INVALID_PAYMENT_TRANSITION";
      reason?: MarketplaceInvalidPaymentReason;
    };

/**
 * Coach marks booking as paid (cash, transfer, or simulated provider success).
 * Rules: booking.status must be `confirmed`; booking.status must not be `cancelled`;
 * paymentStatus must be unpaid, pending, or failed; cannot move from paid/refunded.
 */
export async function markMarketplaceBookingPaid(params: {
  bookingId: string;
  user: ApiUser;
  paymentMethod?: string | null;
  paymentReference?: string | null;
}): Promise<PaymentMutationResult> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.marketplaceSlotBooking.findUnique({
      where: { id: params.bookingId },
      include: { slot: true },
    });
    if (!booking) return { ok: false, code: "NOT_FOUND" };

    const isCoach =
      (params.user.role === "COACH" || params.user.role === "MAIN_COACH") &&
      (await coachOwnsMarketplaceBooking(tx, params.user.id, booking.coachId));
    if (!isCoach) return { ok: false, code: "FORBIDDEN" };

    if (!marketplaceBookingAllowsMarkPaid(booking)) {
      const st = normalizeMarketplaceBookingStatus(booking.status);
      return {
        ok: false,
        code: "INVALID_PAYMENT_TRANSITION",
        reason:
          st !== MARKETPLACE_BOOKING_STATUS.CONFIRMED
            ? "BOOKING_NOT_CONFIRMED"
            : "PAYMENT_STATUS_NOT_MARKABLE",
      };
    }

    const method = normalizePaymentInput(
      params.paymentMethod,
      MARKETPLACE_PAYMENT_FIELD_MAX_LEN
    );
    const reference = normalizePaymentInput(
      params.paymentReference,
      MARKETPLACE_PAYMENT_FIELD_MAX_LEN
    );

    const snapshot = effectiveAmountSnapshot(booking, booking.slot);

    const updated = await tx.marketplaceSlotBooking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: MARKETPLACE_PAYMENT_STATUS.PAID,
        paidAt: new Date(),
        paymentMethod: method,
        paymentReference: reference,
        amountSnapshot: snapshot,
      },
      include: { slot: true },
    });
    return { ok: true, booking: updated };
  });
}

/**
 * Coach marks a previously paid booking as refunded.
 * Rule: paymentStatus must currently be `paid`.
 */
export async function markMarketplaceBookingRefunded(params: {
  bookingId: string;
  user: ApiUser;
}): Promise<PaymentMutationResult> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.marketplaceSlotBooking.findUnique({
      where: { id: params.bookingId },
      include: { slot: true },
    });
    if (!booking) return { ok: false, code: "NOT_FOUND" };

    const isCoach =
      (params.user.role === "COACH" || params.user.role === "MAIN_COACH") &&
      (await coachOwnsMarketplaceBooking(tx, params.user.id, booking.coachId));
    if (!isCoach) return { ok: false, code: "FORBIDDEN" };

    if (!marketplaceBookingAllowsMarkRefunded(booking.paymentStatus)) {
      return {
        ok: false,
        code: "INVALID_PAYMENT_TRANSITION",
        reason: "NOT_PAID_FOR_REFUND",
      };
    }

    const updated = await tx.marketplaceSlotBooking.update({
      where: { id: booking.id },
      data: { paymentStatus: MARKETPLACE_PAYMENT_STATUS.REFUNDED },
      include: { slot: true },
    });
    return { ok: true, booking: updated };
  });
}
