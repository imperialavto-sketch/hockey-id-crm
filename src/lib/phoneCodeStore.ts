const CODE_TTL_MS = 5 * 60 * 1000; // 5 минут

type PhoneCodeEntry = {
  code: string;
  expiresAt: number;
};

const store = new Map<string, PhoneCodeEntry>();

export function normalizePhone(phone: string): string {
  return String(phone ?? "").replace(/\D/g, "").trim();
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-значный
}

function cleanupExpiredCodes(now: number = Date.now()): void {
  store.forEach((entry, phone) => {
    if (entry.expiresAt <= now) {
      store.delete(phone);
    }
  });
}

export function issueCodeForPhone(rawPhone: string): { phone: string; code: string } {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new Error("INVALID_PHONE");

  cleanupExpiredCodes();

  const code = generateCode();
  store.set(phone, { code, expiresAt: Date.now() + CODE_TTL_MS });
  return { phone, code };
}

export function verifyAndConsumeCode(
  rawPhone: string,
  rawCode: string
): "OK" | "EXPIRED" | "INVALID" {
  const phone = normalizePhone(rawPhone);
  const code = String(rawCode ?? "").trim();
  if (!phone || !code) return "INVALID";

  const entry = store.get(phone);
  if (!entry) return "INVALID";

  if (Date.now() > entry.expiresAt) {
    store.delete(phone);
    return "EXPIRED";
  }

  if (entry.code !== code) return "INVALID";

  store.delete(phone);
  cleanupExpiredCodes();
  return "OK";
}

