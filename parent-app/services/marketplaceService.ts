import type { CoachProfileItem } from "@/types/marketplace";
import { apiFetch } from "@/lib/api";
import { logApiError } from "@/lib/apiErrors";
import { isDev } from "@/config/api";
import { apiCoachToMockCoach } from "@/mappers/coachMapper";
import type { MockCoach } from "@/constants/mockCoaches";
import { MOCK_TIME_SLOTS } from "@/constants/mockTimeSlots";
import type { TimeSlot } from "@/types/booking";

const PARENT_ID_HEADER = "x-parent-id";

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
    const data = await apiFetch<CoachProfileItem[]>(path, { headers });
    return Array.isArray(data) ? data : [];
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
    const data = await apiFetch<CoachDetailWithServices>(`/api/marketplace/coaches/${id}`, {
      headers,
    });
    return data && typeof data === "object" && "id" in data ? data : null;
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
  try {
    const data = await getCoachById(id, parentId);
    return data ? apiCoachToMockCoach(data) : null;
  } catch (err) {
    logApiError("marketplaceService.getCoachForUI", err);
    return null;
  }
}

/**
 * Get coach time slots for booking.
 * Returns TimeSlot[] { time, available }.
 * Fallback: MOCK_TIME_SLOTS only in __DEV__ when API fails.
 */
export async function getCoachTimeSlots(
  coachId: string,
  date?: string
): Promise<TimeSlot[]> {
  try {
    const params = date ? `?date=${encodeURIComponent(date)}` : "";
    const data = await apiFetch<{ time: string; available: boolean }[]>(
      `/api/marketplace/coaches/${coachId}/slots${params}`
    );
    if (Array.isArray(data)) {
      return data.map((s) => ({ time: s.time, available: s.available ?? false }));
    }
  } catch (err) {
    logApiError("marketplaceService.getCoachTimeSlots", err);
  }
  if (isDev) return MOCK_TIME_SLOTS.map((s) => ({ time: s.time, available: s.available }));
  return [];
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
