/**
 * Track endpoints that returned 404 this session.
 * Avoids repeated failing requests when coach backend routes are absent.
 */

export const COACH_ENDPOINTS = {
  REPORTS_WEEKLY: '/api/coach/reports/weekly',
  PARENT_DRAFTS: '/api/coach/parent-drafts',
  ACTIONS: '/api/coach/actions',
  MESSAGES: '/api/coach/messages',
} as const;

const unavailablePaths = new Set<string>();

/** Mark path as unavailable (404). Future calls can skip the request. */
export function markEndpointUnavailable(path: string): void {
  const key = path.split('?')[0];
  unavailablePaths.add(key);
  // Also mark base for dynamic routes: /api/coach/messages/123 → /api/coach/messages
  const parts = key.split('/').filter(Boolean);
  if (parts.length > 1) {
    const base = '/' + parts.slice(0, -1).join('/');
    unavailablePaths.add(base);
  }
}

/** Check if path is known to be unavailable. */
export function isEndpointUnavailable(path: string): boolean {
  const key = path.split('?')[0];
  if (unavailablePaths.has(key)) return true;
  for (const p of unavailablePaths) {
    if (key !== p && key.startsWith(p + '/')) return true;
  }
  return false;
}

/** Clear path so next request will be attempted. Call before retry. */
export function clearEndpointUnavailable(path: string): void {
  const key = path.split('?')[0];
  unavailablePaths.delete(key);
  const parts = key.split('/').filter(Boolean);
  if (parts.length > 1) {
    const base = '/' + parts.slice(0, -1).join('/');
    unavailablePaths.delete(base);
  }
}
