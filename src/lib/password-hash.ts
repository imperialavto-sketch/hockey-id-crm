const BCRYPT_PREFIX_RE = /^\$2[aby]\$/;
const BCRYPT_FULL_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export function isSupportedBcryptHash(hash: string | null | undefined): boolean {
  if (!hash || typeof hash !== "string") return false;
  const trimmed = hash.trim();
  if (!BCRYPT_PREFIX_RE.test(trimmed)) return false;
  if (!BCRYPT_FULL_RE.test(trimmed)) return false;
  return true;
}
