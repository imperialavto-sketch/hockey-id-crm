/**
 * UUID v4 (или близкий fallback) для идемпотентности клиентских мутаций и телеметрии.
 */

export function createClientMutationId(): string {
  const cryptoRef =
    typeof globalThis !== "undefined"
      ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
      : undefined;
  if (typeof cryptoRef?.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  return `cm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}
