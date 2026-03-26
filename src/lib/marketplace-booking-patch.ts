/**
 * PATCH /api/marketplace/bookings/[id] accepts only booking lifecycle `status`.
 * Payment fields must use dedicated POST routes.
 */

const FORBIDDEN_KEYS = new Set([
  "paymentStatus",
  "paidAt",
  "paymentMethod",
  "paymentReference",
  "amountSnapshot",
]);

export function marketplaceBookingPatchContainsPaymentKeys(
  body: Record<string, unknown>
): boolean {
  return Object.keys(body).some((k) => FORBIDDEN_KEYS.has(k));
}
