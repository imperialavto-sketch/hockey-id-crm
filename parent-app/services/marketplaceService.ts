import type { CoachProfileItem } from "@/types/marketplace";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { logApiError } from "@/lib/apiErrors";
import { apiCoachToMockCoach } from "@/mappers/coachMapper";
import type { MockCoach } from "@/constants/mockCoaches";
import type { TimeSlot } from "@/types/booking";

const PARENT_ID_HEADER = "x-parent-id";

type RawCoachService = {
  id?: unknown;
  coachId?: unknown;
  title?: unknown;
  category?: unknown;
  description?: unknown;
  durationMinutes?: unknown;
  price?: unknown;
  format?: unknown;
};

type RawCoach = {
  id?: unknown;
  displayName?: unknown;
  fullName?: unknown;
  name?: unknown;
  slug?: unknown;
  city?: unknown;
  location?: unknown;
  bio?: unknown;
  description?: unknown;
  specialties?: unknown;
  specializations?: unknown;
  specialization?: unknown;
  experienceYears?: unknown;
  priceFrom?: unknown;
  price?: unknown;
  rating?: unknown;
  trainingFormats?: unknown;
  formats?: unknown;
  photoUrl?: unknown;
  avatarUrl?: unknown;
  avatar?: unknown;
  isPublished?: unknown;
  services?: unknown;
};

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function toNumberOr(value: unknown, fallback: number): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeSpecialties(raw: RawCoach): string[] {
  const fromSpecialties = Array.isArray(raw.specialties)
    ? raw.specialties.map((item) => toStringOrEmpty(item).trim()).filter(Boolean)
    : [];
  if (fromSpecialties.length > 0) return fromSpecialties;

  const fromSpecializations = Array.isArray(raw.specializations)
    ? raw.specializations.map((item) => toStringOrEmpty(item).trim()).filter(Boolean)
    : [];
  if (fromSpecializations.length > 0) return fromSpecializations;

  const specialization = toStringOrEmpty(raw.specialization).trim();
  return specialization ? [specialization] : [];
}

function normalizeTrainingFormats(raw: RawCoach): string[] {
  const fromTraining = Array.isArray(raw.trainingFormats)
    ? raw.trainingFormats.map((item) => toStringOrEmpty(item).trim()).filter(Boolean)
    : [];
  if (fromTraining.length > 0) return fromTraining;
  if (Array.isArray(raw.formats)) {
    return raw.formats.map((item) => toStringOrEmpty(item).trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

function normalizeCoachServices(rawServices: unknown): CoachDetailWithServices["services"] {
  if (!Array.isArray(rawServices)) return [];

  return rawServices.map((service, index) => {
    const raw = (service ?? {}) as RawCoachService;
    return {
      id: toStringOrEmpty(raw.id) || `service_${index}`,
      coachId: toStringOrEmpty(raw.coachId),
      title: toStringOrEmpty(raw.title),
      category: toStringOrEmpty(raw.category),
      description: toStringOrEmpty(raw.description),
      durationMinutes: toNumberOr(raw.durationMinutes, 0),
      price: toNumberOr(raw.price, 0),
      format: toStringOrEmpty(raw.format),
    };
  });
}

function normalizeCoachListItem(item: unknown): CoachProfileItem {
  const raw = (item ?? {}) as RawCoach;
  const id = toStringOrEmpty(raw.id);
  const fullName = toStringOrEmpty(
    raw.displayName || raw.fullName || raw.name
  );
  const specialties = normalizeSpecialties(raw);
  const trainingFormats = normalizeTrainingFormats(raw);

  return {
    id,
    fullName,
    slug: toStringOrEmpty(raw.slug) || id,
    city: toStringOrEmpty(raw.city || raw.location),
    bio: toStringOrEmpty(raw.bio || raw.description),
    specialties,
    experienceYears: toNumberOr(raw.experienceYears, 0),
    priceFrom: toNumberOr(raw.priceFrom ?? raw.price, 0),
    rating: raw.rating == null ? null : toNumberOr(raw.rating, 0),
    trainingFormats: trainingFormats as CoachProfileItem["trainingFormats"],
    photoUrl: toStringOrEmpty(raw.photoUrl || raw.avatarUrl || raw.avatar) || null,
    isPublished: raw.isPublished === false ? false : true,
  };
}

function normalizeCoachDetail(item: unknown): CoachDetailWithServices {
  const raw = (item ?? {}) as RawCoach;
  const services = normalizeCoachServices(raw.services);
  const normalizedBase = normalizeCoachListItem({
    ...raw,
    priceFrom:
      raw.priceFrom ??
      (services.length > 0 ? Math.min(...services.map((service) => service.price)) : raw.price),
  });

  return {
    ...normalizedBase,
    services,
  };
}

export interface MarketplaceCoachesFilters {
  city?: string;
  category?: string;
  format?: string;
}

/** Fetch coaches from GET /api/marketplace/coaches with optional x-parent-id header. */
export async function getMarketplaceCoaches(
  filters?: MarketplaceCoachesFilters,
  parentId?: string | null
): Promise<CoachProfileItem[]> {
  const params = new URLSearchParams();
  if (filters?.city) params.set("city", filters.city);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.format) params.set("format", filters.format);
  const qs = params.toString();
  const path = qs ? `/api/marketplace/coaches?${qs}` : "/api/marketplace/coaches";
  const headers: Record<string, string> = {};
  if (parentId) headers[PARENT_ID_HEADER] = parentId;
  try {
    const data = await apiFetch<unknown[]>(path, { headers });
    return Array.isArray(data) ? data.map(normalizeCoachListItem) : [];
  } catch (err) {
    logApiError("marketplaceService.getMarketplaceCoaches", err, path);
    throw err;
  }
}

/**
 * Get coaches list for marketplace UI.
 * Returns MockCoach[] for compatibility with CoachCard, matchCoachesToPlayer.
 */
export async function getCoaches(
  filters?: MarketplaceCoachesFilters,
  parentId?: string | null
): Promise<MockCoach[]> {
  try {
    const data = await getMarketplaceCoaches(filters, parentId);
    return Array.isArray(data) ? data.map(apiCoachToMockCoach) : [];
  } catch (err) {
    logApiError("marketplaceService.getCoaches", err);
    throw err;
  }
}

export interface CoachDetailWithServices extends CoachProfileItem {
  services: {
    id: string;
    coachId: string;
    title: string;
    category: string;
    description: string;
    durationMinutes: number;
    price: number;
    format: string;
  }[];
}

export async function getCoachById(
  id: string,
  parentId?: string | null
): Promise<CoachDetailWithServices | null> {
  const headers: Record<string, string> = {};
  if (parentId) headers[PARENT_ID_HEADER] = parentId;
  try {
    const data = await apiFetch<unknown>(`/api/marketplace/coaches/${id}`, {
      headers,
    });
    return data && typeof data === "object" && "id" in (data as object)
      ? normalizeCoachDetail(data)
      : null;
  } catch (err) {
    logApiError("marketplaceService.getCoachById", err, `/api/marketplace/coaches/${id}`);
    throw err;
  }
}

/** Get coach by id for marketplace UI (MockCoach shape). */
export async function getCoachForUI(
  id: string,
  parentId?: string | null
): Promise<MockCoach | null> {
  const data = await getCoachById(id, parentId);
  return data ? apiCoachToMockCoach(data) : null;
}

export interface MarketplaceAvailabilitySlot {
  id: string;
  coachId: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  type: string;
  isBooked: boolean;
}

function normalizeAvailabilitySlot(raw: unknown): MarketplaceAvailabilitySlot | null {
  const o = raw as Record<string, unknown>;
  const id = toStringOrEmpty(o.id);
  if (!id) return null;
  const dateRaw = toStringOrEmpty(o.date);
  const date =
    dateRaw.length >= 10
      ? dateRaw.slice(0, 10)
      : dateRaw
        ? new Date(dateRaw).toISOString().slice(0, 10)
        : "";
  return {
    id,
    coachId: toStringOrEmpty(o.coachId),
    date,
    startTime: toStringOrEmpty(o.startTime),
    endTime: toStringOrEmpty(o.endTime),
    price: toNumberOr(o.price, 0),
    type: toStringOrEmpty(o.type),
    isBooked: o.isBooked === true,
  };
}

/** GET /api/marketplace/coaches/[id]/slots — free slots for independent coach. */
export async function getMarketplaceCoachSlots(
  coachId: string
): Promise<MarketplaceAvailabilitySlot[]> {
  const data = await apiFetch<{ slots?: unknown }>(
    `/api/marketplace/coaches/${coachId}/slots`
  );
  const slots = data?.slots;
  if (!Array.isArray(slots)) return [];
  return slots
    .map(normalizeAvailabilitySlot)
    .filter((s): s is MarketplaceAvailabilitySlot => s != null && !s.isBooked);
}

/**
 * Legacy shape for old pickers; prefer getMarketplaceCoachSlots + slot id for booking.
 */
export async function getCoachTimeSlots(
  coachId: string,
  _date?: string
): Promise<TimeSlot[]> {
  const rows = await getMarketplaceCoachSlots(coachId);
  return rows.map((s) => ({
    time: `${s.startTime}–${s.endTime}`,
    available: true,
  }));
}

export interface MarketplaceSlotBookingRow {
  id: string;
  slotId: string;
  coachId: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  type: string;
  paymentStatus: string;
  paidAt: string | null;
  amountSnapshot: number;
  paymentMethod: string | null;
}

function normalizeSlotBookingRow(raw: unknown): MarketplaceSlotBookingRow | null {
  const o = raw as Record<string, unknown>;
  const id = toStringOrEmpty(o.id);
  if (!id) return null;
  const price = toNumberOr(o.price, 0);
  let amountSnapshot = Math.max(0, Math.floor(Number.isFinite(price) ? price : 0));
  if (typeof o.amountSnapshot === "number" && Number.isFinite(o.amountSnapshot)) {
    amountSnapshot = Math.max(0, Math.floor(o.amountSnapshot));
  }
  const pmRaw = typeof o.paymentMethod === "string" ? o.paymentMethod.trim() : "";
  return {
    id,
    slotId: toStringOrEmpty(o.slotId),
    coachId: toStringOrEmpty(o.coachId),
    status: toStringOrEmpty(o.status) || "pending",
    date: toStringOrEmpty(o.date).slice(0, 10),
    startTime: toStringOrEmpty(o.startTime),
    endTime: toStringOrEmpty(o.endTime),
    price,
    type: toStringOrEmpty(o.type),
    paymentStatus: toStringOrEmpty(o.paymentStatus) || "unpaid",
    paidAt: typeof o.paidAt === "string" && o.paidAt.trim() ? o.paidAt.trim() : null,
    amountSnapshot,
    paymentMethod: pmRaw.length > 0 ? pmRaw : null,
  };
}

/** GET /api/marketplace/bookings/me — Bearer auth. */
export async function getMarketplaceSlotBookingsMe(): Promise<MarketplaceSlotBookingRow[]> {
  try {
    const data = await apiFetch<unknown[]>("/api/marketplace/bookings/me");
    if (!Array.isArray(data)) return [];
    return data
      .map(normalizeSlotBookingRow)
      .filter((r): r is MarketplaceSlotBookingRow => r != null);
  } catch (err) {
    logApiError("marketplaceService.getMarketplaceSlotBookingsMe", err);
    throw err;
  }
}

export interface PostMarketplaceSlotBookingPayload {
  slotId: string;
  coachId?: string;
  parentName: string;
  parentPhone: string;
  playerId?: string | null;
  message?: string | null;
}

export type PostMarketplaceSlotBookingResult =
  | { ok: true; booking: MarketplaceSlotBookingRow }
  | { ok: false; error: string; status?: number; code?: string };

/** POST /api/marketplace/bookings — Bearer auth, role PARENT. */
export async function postMarketplaceSlotBooking(
  payload: PostMarketplaceSlotBookingPayload
): Promise<PostMarketplaceSlotBookingResult> {
  try {
    const data = await apiFetch<unknown>("/api/marketplace/bookings", {
      method: "POST",
      body: JSON.stringify({
        slotId: payload.slotId,
        coachId: payload.coachId,
        parentName: payload.parentName,
        parentPhone: payload.parentPhone,
        playerId: payload.playerId ?? undefined,
        message: payload.message ?? undefined,
      }),
    });
    const row = normalizeSlotBookingRow(data);
    if (!row) {
      return { ok: false, error: "Некорректный ответ сервера" };
    }
    return { ok: true, booking: row };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return {
        ok: false,
        error: err.message,
        status: err.status,
        code: err.code,
      };
    }
    const msg = err instanceof Error ? err.message : "Не удалось забронировать";
    return { ok: false, error: msg };
  }
}

export async function cancelMarketplaceSlotBooking(
  bookingId: string
): Promise<
  | { ok: true }
  | { ok: false; error: string; status?: number; code?: string }
> {
  try {
    await apiFetch<unknown>(`/api/marketplace/bookings/${bookingId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return {
        ok: false,
        error: err.message,
        status: err.status,
        code: err.code,
      };
    }
    const msg = err instanceof Error ? err.message : "Не удалось отменить";
    return { ok: false, error: msg };
  }
}

export interface BookingRequestPayload {
  coachId: string;
  parentName: string;
  parentPhone: string;
  playerId?: string | null;
  message?: string;
  preferredDate?: string | null;
}

export async function submitBookingRequest(
  payload: BookingRequestPayload,
  parentId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (parentId) headers[PARENT_ID_HEADER] = parentId;

    await apiFetch<{ id: string; message: string }>("/api/marketplace/booking-request", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Не удалось отправить заявку";
    return { success: false, error: msg };
  }
}
