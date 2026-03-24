/**
 * Recent Skills — builds list of recently used skills from session observations
 */

import type { SessionObservation } from "@/models/sessionObservation";
import type { SkillType } from "@/models/playerDevelopment";

const MAX_RECENT_SKILLS = 5;

/**
 * Build list of unique skills from observations, ordered by recency.
 * Most recently used skill first. Returns up to 5 skills.
 */
export function getRecentSkillsFromObservations(
  observations: SessionObservation[]
): SkillType[] {
  const seen = new Set<SkillType>();
  const result: SkillType[] = [];

  for (const obs of observations) {
    if (seen.has(obs.skillType)) continue;
    seen.add(obs.skillType);
    result.push(obs.skillType);
    if (result.length >= MAX_RECENT_SKILLS) break;
  }

  return result;
}
