export type CoachCategory =
  | "skating"
  | "shooting"
  | "stickhandling"
  | "goalie"
  | "strength"
  | "team_extra_training"
  | "individual_training";

export type CoachFormat =
  | "individual"
  | "group"
  | "online"
  | "offline";

export interface CoachProfileItem {
  id: string;
  fullName: string;
  slug: string;
  city: string;
  bio: string;
  specialties: string[];
  experienceYears: number;
  priceFrom: number;
  rating?: number | null;
  trainingFormats: CoachFormat[];
  photoUrl?: string | null;
  isPublished: boolean;
}

export interface CoachServiceItem {
  id: string;
  coachId: string;
  title: string;
  category: CoachCategory | string;
  description: string;
  durationMinutes: number;
  price: number;
  format: CoachFormat;
}
