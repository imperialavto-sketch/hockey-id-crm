import type { CoachProfileItem } from "@/types/marketplace";
import type { CoachDetailWithServices } from "@/services/marketplaceService";
import type { MockCoach } from "@/constants/mockCoaches";

/**
 * Map API coach (CoachProfileItem or CoachDetailWithServices) to MockCoach for UI.
 * Preserves existing UI types without changes.
 */
export function apiCoachToMockCoach(api: CoachProfileItem | CoachDetailWithServices): MockCoach {
  const specialization = api.specialties?.[0] ?? "Тренер";
  return {
    id: api.id,
    fullName: api.fullName,
    specialization,
    city: api.city,
    rating: api.rating ?? 0,
    reviewsCount: (api as { reviewsCount?: number }).reviewsCount ?? 0,
    price: api.priceFrom ?? (api as { price?: number }).price ?? 0,
    photoUrl: api.photoUrl ?? "",
    experienceYears: api.experienceYears,
    bio: api.bio,
    verified: (api as { verified?: boolean }).verified ?? true,
    documentsChecked: (api as { documentsChecked?: boolean }).documentsChecked ?? true,
    sessionsCompleted: (api as { sessionsCompleted?: number }).sessionsCompleted ?? 0,
    repeatBookingRate: (api as { repeatBookingRate?: number }).repeatBookingRate ?? 0,
    responseTime: (api as { responseTime?: string }).responseTime ?? "до 24 часов",
    ageGroups: (api as { ageGroups?: string[] }).ageGroups,
    specializations: api.specialties ?? [],
    methods: (api as { methods?: string }).methods,
    achievements: (api as { achievements?: string }).achievements,
  };
}
