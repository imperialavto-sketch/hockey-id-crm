/**
 * Coach Mark Recommended Trainers v1.
 * Rule-based: focus/trainingGoal/memory -> specialization -> filter coaches.
 * No backend, uses existing getCoaches.
 */

import { getCoaches } from "@/services/marketplaceService";
import type { CoachMarkMemory } from "@/services/coachMarkMemory";
import type { CoachMarkWeeklyPlan, CoachMarkCalendarItem } from "@/services/coachMarkStorage";
import type { MockCoach } from "@/constants/mockCoaches";

const MAX_RECOMMENDED = 3;

/** Map focus/training keywords to marketplace category (specialization filter). */
function inferCategory(
  memories: CoachMarkMemory[],
  plans: CoachMarkWeeklyPlan[],
  calendarItems: CoachMarkCalendarItem[]
): string | undefined {
  const parts: string[] = [];

  for (const m of memories) {
    if (["preferredFocus", "trainingGoal", "parentConcern"].includes(m.key)) {
      parts.push(m.value.toLowerCase());
    }
  }
  for (const p of plans) {
    if (p.focus) parts.push(p.focus.toLowerCase());
  }
  for (const c of calendarItems) {
    if (c.title) parts.push(c.title.toLowerCase());
    if (c.details) parts.push(c.details.toLowerCase());
  }

  const text = parts.join(" ");

  // shooting / release / бросок
  if (
    /бросок|shooting|release|щелчок|кистевой/.test(text)
  ) {
    return "Бросок";
  }
  // acceleration / first step / skating / катание
  if (
    /катание|skating|acceleration|first\s*step|скорость|координация|ускорение/.test(text)
  ) {
    return "Катание";
  }
  // confidence / hockey IQ / game sense
  if (
    /уверенность|confidence|hockey\s*iq|игровое\s*мышление|game\s*sense|тактик|позиционирование/.test(text)
  ) {
    return "Игровое мышление";
  }
  // skill development / stickhandling
  if (
    /stickhandling|техник|клюшк|обводк|ведение|борт|skill/.test(text)
  ) {
    return "Stickhandling";
  }
  // strength / physical
  if (
    /силовая|физик|офп|устойчивость|сила/.test(text)
  ) {
    return "Силовая подготовка";
  }
  // подкатка
  if (/подкатка|goalie|вратар/.test(text)) {
    return "Подкатка";
  }

  return undefined;
}

export interface CoachMarkRecommendedCoach {
  id: string;
  fullName: string;
  specialization: string;
  city: string;
  rating: number;
  price: number;
  photoUrl: string;
}

/**
 * Get 1–3 recommended coaches for Coach Mark Hub.
 * Uses memories, plans, calendar items to infer focus -> category filter.
 * Fallback: top rated when no clear signal.
 */
export async function getCoachMarkRecommendedCoaches(
  context: {
    memories: CoachMarkMemory[];
    plans: CoachMarkWeeklyPlan[];
    calendarItems: CoachMarkCalendarItem[];
  },
  parentId?: string | null
): Promise<CoachMarkRecommendedCoach[]> {
  try {
    const category = inferCategory(
      context.memories,
      context.plans,
      context.calendarItems
    );

    const filters = category ? { category } : undefined;
    const coaches: MockCoach[] = await getCoaches(filters, parentId);

    // Sort by rating desc, take top N
    const sorted = [...coaches].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    const top = sorted.slice(0, MAX_RECOMMENDED);

    return top.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      specialization: c.specialization,
      city: c.city,
      rating: c.rating ?? 0,
      price: c.price ?? 0,
      photoUrl: c.photoUrl ?? "",
    }));
  } catch {
    return [];
  }
}
