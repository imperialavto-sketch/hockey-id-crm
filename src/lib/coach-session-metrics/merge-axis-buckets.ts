/**
 * Deep-merge axis JSON buckets: patch keys override; `null` in patch removes that axis key.
 * Used by PATCH structured-metrics so UI slices do not wipe unrelated axes (e.g. puckControl).
 */
export function mergeAxisBucket(
  previous: unknown,
  patch: Record<string, number | null> | null | undefined
): Record<string, number | null> | null | undefined {
  if (patch === undefined) return undefined;
  if (patch === null) return null;
  const base: Record<string, number | null> =
    previous !== null &&
    typeof previous === "object" &&
    !Array.isArray(previous)
      ? { ...(previous as Record<string, number | null>) }
      : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) {
      delete base[k];
    } else {
      base[k] = v;
    }
  }
  return Object.keys(base).length > 0 ? base : null;
}
