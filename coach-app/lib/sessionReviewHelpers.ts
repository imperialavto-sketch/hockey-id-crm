/**
 * Session review — deterministic helpers for summary and grouping
 */

import type { SessionObservation } from "@/models/sessionObservation";
import type { SkillType } from "@/models/playerDevelopment";

export type ObservationImpact = "positive" | "negative" | "neutral";

export interface GroupedByPlayer {
  playerId: string;
  playerName: string;
  observations: SessionObservation[];
}

export function groupObservationsByPlayer(
  observations: SessionObservation[]
): GroupedByPlayer[] {
  const byPlayer = new Map<string, SessionObservation[]>();
  for (const obs of observations) {
    const list = byPlayer.get(obs.playerId) ?? [];
    list.push(obs);
    byPlayer.set(obs.playerId, list);
  }
  return Array.from(byPlayer.entries()).map(([playerId, obsList]) => {
    const first = obsList[0]!;
    return {
      playerId,
      playerName: first.playerName,
      observations: obsList.sort((a, b) => b.createdAt - a.createdAt),
    };
  });
}

export interface ImpactCounts {
  positive: number;
  neutral: number;
  negative: number;
}

export function countImpacts(observations: SessionObservation[]): ImpactCounts {
  const counts: ImpactCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const obs of observations) {
    counts[obs.impact]++;
  }
  return counts;
}

export function computeMostObservedSkill(
  observations: SessionObservation[]
): SkillType | null {
  if (observations.length === 0) return null;
  const bySkill = new Map<SkillType, number>();
  for (const obs of observations) {
    bySkill.set(obs.skillType, (bySkill.get(obs.skillType) ?? 0) + 1);
  }
  let max = 0;
  let top: SkillType | null = null;
  for (const [skill, count] of bySkill) {
    if (count > max) {
      max = count;
      top = skill;
    }
  }
  return top;
}

function pluralObsRu(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "наблюдение";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "наблюдения";
  return "наблюдений";
}

export function buildPlayerSummaryText(
  observations: SessionObservation[],
  skillLabels: Record<SkillType, string>
): string {
  if (observations.length === 0) return "";
  const counts = countImpacts(observations);
  const skills = [...new Set(observations.map((o) => o.skillType))];
  const skillNames = skills.map((s) => skillLabels[s]).join(", ");
  const parts: string[] = [];
  if (counts.positive > 0)
    parts.push(`${counts.positive} позитивных ${pluralObsRu(counts.positive)}`);
  if (counts.neutral > 0)
    parts.push(`${counts.neutral} нейтральных ${pluralObsRu(counts.neutral)}`);
  if (counts.negative > 0)
    parts.push(`${counts.negative} негативных ${pluralObsRu(counts.negative)}`);
  const impactStr = parts.join(", ");
  const focus = skillNames ? `; фокус: ${skillNames}` : "";
  return `${impactStr}${focus}`;
}
