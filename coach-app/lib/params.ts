/**
 * Safe param helpers for route params (useLocalSearchParams).
 * Handles string | string[] | undefined from expo-router.
 */

/**
 * Normalize id param from useLocalSearchParams.
 * Returns string or null if no valid id.
 */
export function getParamId(param: string | string[] | undefined): string | null {
  if (param == null) return null;
  if (typeof param === 'string') return param.trim() || null;
  if (Array.isArray(param) && param[0]) return String(param[0]).trim() || null;
  return null;
}
