import type { Coach, Prisma } from "@prisma/client";

const DISPLAY_NAME_MIN = 1;
const DISPLAY_NAME_MAX = 120;
const CITY_MAX = 100;
const BIO_MAX = 2000;
const ARRAY_MAX_ITEMS = 20;
const ARRAY_ITEM_MAX = 80;

/** Matches availability types and marketplace filter vocabulary. */
const ALLOWED_FORMATS = new Set(["ice", "gym", "private"]);

export type MarketplaceCoachPublic = {
  id: string;
  displayName: string;
  city: string | null;
  bio: string | null;
  specialties: string[];
  formats: string[];
  priceFrom: number | null;
  avatarUrl: string | null;
  isMarketplaceIndependent: boolean;
};

export function validateDisplayName(v: unknown): string {
  if (typeof v !== "string") throw new Error("displayName must be a string");
  const t = v.trim();
  if (t.length < DISPLAY_NAME_MIN || t.length > DISPLAY_NAME_MAX) {
    throw new Error(
      `displayName must be ${DISPLAY_NAME_MIN}-${DISPLAY_NAME_MAX} characters`,
    );
  }
  return t;
}

export function validateCity(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw new Error("city must be a string");
  const t = v.trim();
  if (t.length > CITY_MAX) throw new Error(`city max ${CITY_MAX} characters`);
  return t || null;
}

export function validateBio(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw new Error("bio must be a string");
  const t = v.trim();
  if (t.length > BIO_MAX) throw new Error(`bio max ${BIO_MAX} characters`);
  return t || null;
}

export function validatePriceFrom(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    throw new Error("priceFrom must be a non-negative integer");
  }
  return v;
}

export function normalizeSpecialties(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new Error("specialties must be an array");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of v) {
    if (typeof item !== "string") continue;
    const t = item.trim().slice(0, ARRAY_ITEM_MAX);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= ARRAY_MAX_ITEMS) break;
  }
  return out;
}

export function normalizeFormats(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new Error("formats must be an array");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of v) {
    if (typeof item !== "string") continue;
    const t = item.trim().toLowerCase();
    if (!t || !ALLOWED_FORMATS.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= ARRAY_MAX_ITEMS) break;
  }
  return out;
}

export function validateAvatarUrl(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw new Error("avatarUrl must be a string");
  const t = v.trim();
  if (t.length > 2048) throw new Error("avatarUrl too long");
  return t || null;
}

export function splitDisplayNameForCoach(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0] || "Coach", lastName: "—" };
  }
  const firstName = parts[0] || "Coach";
  const lastName = parts.slice(1).join(" ") || "—";
  return { firstName, lastName };
}

export function coachToMarketplacePublic(c: Coach): MarketplaceCoachPublic {
  const specialties = jsonStringArray(c.specialties);
  const formats = jsonStringArray(c.formats);
  return {
    id: c.id,
    displayName: c.displayName?.trim() || `${c.firstName} ${c.lastName}`.trim(),
    city: c.city ?? null,
    bio: c.bio ?? null,
    specialties,
    formats,
    priceFrom: c.priceFrom ?? null,
    avatarUrl: c.photoUrl ?? null,
    isMarketplaceIndependent: c.isMarketplaceIndependent,
  };
}

function jsonStringArray(j: unknown): string[] {
  if (j === null || j === undefined) return [];
  if (!Array.isArray(j)) return [];
  return j.filter((x): x is string => typeof x === "string");
}

export type IndependentCoachRegisterInput = {
  displayName: string;
  city: string | null;
  bio: string | null;
  specialties: string[];
  formats: string[];
  priceFrom: number | null;
  photoUrl: string | null;
};

export function buildCoachMarketplaceUpdate(
  input: IndependentCoachRegisterInput,
): Prisma.CoachUpdateInput {
  const { firstName, lastName } = splitDisplayNameForCoach(input.displayName);
  return {
    firstName,
    lastName,
    displayName: input.displayName,
    city: input.city,
    bio: input.bio,
    specialties: input.specialties as unknown as Prisma.InputJsonValue,
    formats: input.formats as unknown as Prisma.InputJsonValue,
    priceFrom: input.priceFrom ?? undefined,
    photoUrl: input.photoUrl ?? undefined,
    isMarketplaceIndependent: true,
  };
}

/** Public list/detail JSON: canonical marketplace fields plus legacy keys for parent-app clients. */
export function serializeMarketplaceCoachResponse(pub: MarketplaceCoachPublic) {
  return {
    id: pub.id,
    displayName: pub.displayName,
    city: pub.city,
    bio: pub.bio ?? "",
    specialties: pub.specialties,
    formats: pub.formats,
    priceFrom: pub.priceFrom,
    avatarUrl: pub.avatarUrl,
    isMarketplaceIndependent: pub.isMarketplaceIndependent,
    fullName: pub.displayName,
    slug: pub.id,
    trainingFormats: pub.formats,
    photoUrl: pub.avatarUrl,
  };
}

export function parseRegisterBody(body: Record<string, unknown>): IndependentCoachRegisterInput {
  const displayName = validateDisplayName(body.displayName);
  const city = validateCity(body.city);
  const bio = validateBio(body.bio);
  const specialties = normalizeSpecialties(body.specialties);
  const formats = normalizeFormats(body.formats);
  const priceFrom = validatePriceFrom(body.priceFrom);
  const photoUrl = validateAvatarUrl(
    body.avatarUrl !== undefined ? body.avatarUrl : body.photoUrl,
  );
  return {
    displayName,
    city,
    bio,
    specialties,
    formats,
    priceFrom,
    photoUrl,
  };
}

export function parsePatchBody(body: Record<string, unknown>): Partial<IndependentCoachRegisterInput> {
  const out: Partial<IndependentCoachRegisterInput> = {};
  if ("displayName" in body) {
    out.displayName = validateDisplayName(body.displayName);
  }
  if ("city" in body) out.city = validateCity(body.city);
  if ("bio" in body) out.bio = validateBio(body.bio);
  if ("specialties" in body) out.specialties = normalizeSpecialties(body.specialties);
  if ("formats" in body) out.formats = normalizeFormats(body.formats);
  if ("priceFrom" in body) out.priceFrom = validatePriceFrom(body.priceFrom);
  if ("avatarUrl" in body || "photoUrl" in body) {
    out.photoUrl = validateAvatarUrl(
      body.avatarUrl !== undefined ? body.avatarUrl : body.photoUrl,
    );
  }
  return out;
}

export function mergePatchIntoCoachUpdate(
  patch: Partial<IndependentCoachRegisterInput>,
): Prisma.CoachUpdateInput {
  const data: Prisma.CoachUpdateInput = {};
  if (patch.displayName !== undefined) {
    const { firstName, lastName } = splitDisplayNameForCoach(patch.displayName);
    data.firstName = firstName;
    data.lastName = lastName;
    data.displayName = patch.displayName;
  }
  if (patch.city !== undefined) data.city = patch.city;
  if (patch.bio !== undefined) data.bio = patch.bio;
  if (patch.specialties !== undefined) {
    data.specialties = patch.specialties as unknown as Prisma.InputJsonValue;
  }
  if (patch.formats !== undefined) {
    data.formats = patch.formats as unknown as Prisma.InputJsonValue;
  }
  if (patch.priceFrom !== undefined) data.priceFrom = patch.priceFrom;
  if (patch.photoUrl !== undefined) data.photoUrl = patch.photoUrl;
  return data;
}
