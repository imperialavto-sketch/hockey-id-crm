/**
 * Marketplace booking APIs accept a real parent Bearer (SMS session or CRM parent JWT).
 * Demo mode uses a synthetic token that the backend rejects — treat it separately in UI.
 */

export function isParentDemoApiToken(token: string | null | undefined): boolean {
  const t = token?.trim();
  if (!t) return false;
  return t.startsWith("demo-token-");
}

/** True when the current Bearer should be accepted by marketplace booking endpoints. */
export function hasMarketplaceBookingApiAuth(token: string | null | undefined): boolean {
  const t = token?.trim();
  return !!t && !isParentDemoApiToken(t);
}
