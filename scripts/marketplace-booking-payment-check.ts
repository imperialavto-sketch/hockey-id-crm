/**
 * Lightweight QA checks for marketplace booking payment rules and serializers.
 * Run: npx tsx scripts/marketplace-booking-payment-check.ts
 * No server or DB required.
 */

import assert from "node:assert/strict";
import {
  getCoachMarketplaceBookingActions,
  marketplaceBookingAllowsMarkPaid,
  marketplaceBookingAllowsMarkRefunded,
  MARKETPLACE_BOOKING_STATUS,
  MARKETPLACE_PAYMENT_STATUS,
  normalizeMarketplaceBookingStatus,
  parentCanCancelMarketplaceBooking,
} from "../src/lib/marketplace-booking-lifecycle";
import {
  serializeMarketplaceBooking,
  serializeMarketplaceBookingForCoach,
} from "../src/lib/marketplace-slot-booking";
import { marketplaceBookingPatchContainsPaymentKeys } from "../src/lib/marketplace-booking-patch";
import type { CoachAvailability, MarketplaceSlotBooking } from "@prisma/client";

function baseSlot(over: Partial<CoachAvailability> = {}): CoachAvailability {
  return {
    id: "slot_1",
    coachId: "coach_1",
    date: new Date("2026-03-15T00:00:00.000Z"),
    startTime: "10:00",
    endTime: "11:00",
    price: 3500,
    type: "ice",
    isBooked: true,
    createdAt: new Date(),
    ...over,
  } as CoachAvailability;
}

function baseBooking(
  over: Partial<MarketplaceSlotBooking> & { slot?: CoachAvailability } = {}
): MarketplaceSlotBooking & { slot: CoachAvailability } {
  const slot = over.slot ?? baseSlot();
  const { slot: _slotOverride, ...bookingOver } = over;
  return {
    id: "book_1",
    slotId: slot.id,
    coachId: slot.coachId,
    bookerUserId: "parent_1",
    status: MARKETPLACE_BOOKING_STATUS.CONFIRMED,
    parentName: "Test",
    parentPhone: "+7000",
    playerId: null,
    message: null,
    paymentStatus: MARKETPLACE_PAYMENT_STATUS.UNPAID,
    paymentMethod: null,
    paidAt: null,
    paymentReference: null,
    amountSnapshot: slot.price,
    createdAt: new Date(),
    updatedAt: new Date(),
    slot,
    ...bookingOver,
  } as MarketplaceSlotBooking & { slot: CoachAvailability };
}

function main() {
  assert.equal(
    marketplaceBookingAllowsMarkPaid({
      status: MARKETPLACE_BOOKING_STATUS.CONFIRMED,
      paymentStatus: MARKETPLACE_PAYMENT_STATUS.UNPAID,
    }),
    true
  );
  assert.equal(
    marketplaceBookingAllowsMarkPaid({
      status: MARKETPLACE_BOOKING_STATUS.CONFIRMED,
      paymentStatus: MARKETPLACE_PAYMENT_STATUS.PAID,
    }),
    false
  );
  assert.equal(
    marketplaceBookingAllowsMarkPaid({
      status: MARKETPLACE_BOOKING_STATUS.CANCELLED,
      paymentStatus: MARKETPLACE_PAYMENT_STATUS.UNPAID,
    }),
    false,
    "cancelled cannot be marked paid"
  );
  assert.equal(
    marketplaceBookingAllowsMarkRefunded(MARKETPLACE_PAYMENT_STATUS.PAID),
    true
  );
  assert.equal(
    marketplaceBookingAllowsMarkRefunded(MARKETPLACE_PAYMENT_STATUS.UNPAID),
    false,
    "unpaid -> refunded fails"
  );

  assert.equal(marketplaceBookingPatchContainsPaymentKeys({ status: "confirmed" }), false);
  assert.equal(
    marketplaceBookingPatchContainsPaymentKeys({ status: "confirmed", paymentStatus: "paid" }),
    true
  );

  const parentJson = serializeMarketplaceBooking(baseBooking());
  assert.ok("paymentStatus" in parentJson);
  assert.ok("paidAt" in parentJson);
  assert.ok("amountSnapshot" in parentJson);
  assert.ok("paymentMethod" in parentJson);
  assert.equal("paymentReference" in parentJson, false, "parent serializer omits paymentReference");

  const coachJson = serializeMarketplaceBookingForCoach(
    baseBooking({
      paymentStatus: MARKETPLACE_PAYMENT_STATUS.PAID,
      paidAt: new Date("2026-03-10T12:00:00.000Z"),
      paymentMethod: "manual",
      paymentReference: "ref_abc",
    })
  );
  assert.equal(coachJson.paymentReference, "ref_abc");
  assert.ok(coachJson.parentName);

  const corrupt = serializeMarketplaceBooking(
    baseBooking({
      amountSnapshot: Number.NaN as unknown as number,
      slot: baseSlot({ price: 4200 }),
    })
  );
  assert.equal(Number.isFinite(corrupt.amountSnapshot), true);
  assert.equal(corrupt.amountSnapshot, 4200);

  assert.equal(
    normalizeMarketplaceBookingStatus("  PENDING "),
    MARKETPLACE_BOOKING_STATUS.PENDING
  );

  const pendingUnpaid = getCoachMarketplaceBookingActions({
    status: "pending",
    paymentStatus: "unpaid",
  });
  assert.equal(pendingUnpaid.canConfirm, true);
  assert.equal(pendingUnpaid.canMarkPaid, false);

  const confirmedUnpaid = getCoachMarketplaceBookingActions({
    status: "confirmed",
    paymentStatus: "unpaid",
  });
  assert.equal(confirmedUnpaid.canMarkPaid, true);
  assert.equal(confirmedUnpaid.canConfirm, false);

  const cancelledPaid = getCoachMarketplaceBookingActions({
    status: "cancelled",
    paymentStatus: "paid",
  });
  assert.equal(cancelledPaid.canMarkRefunded, true);
  assert.equal(cancelledPaid.canCancel, false);
  assert.equal(cancelledPaid.canMarkPaid, false);

  assert.equal(parentCanCancelMarketplaceBooking("pending"), true);
  assert.equal(parentCanCancelMarketplaceBooking("cancelled"), false);

  console.log("marketplace-booking-payment-check: OK");
}

main();
