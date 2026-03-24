/**
 * Live Team Session Pulse — session-wide live stats
 */

import type { SessionObservation } from "@/models/sessionObservation";
import type { SkillType } from "@/models/playerDevelopment";

const SKILL_NAMES_INFLECTED: Record<string, string> = {
  skating: "катании",
  shooting: "бросках",
  passing: "передачах",
  positioning: "позиционировании",
  defense: "защите",
  effort: "усилии",
  confidence: "уверенности",
  communication: "коммуникации",
};

export interface TeamSessionPulse {
  total: number;
  uniquePlayers: number;
  positive: number;
  neutral: number;
  negative: number;
  topSkills: SkillType[];
  topPlayers: Array<{ playerId: string; playerName: string }>;
  summaryLine: string;
  attentionSkewed: boolean;
}

const ATTENTION_SKEW_THRESHOLD = 0.5;

export function getLiveTeamSessionPulse(
  observations: SessionObservation[]
): TeamSessionPulse {
  const total = observations.length;

  const playerIds = new Set<string>();
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  const skillCounts = new Map<SkillType, number>();
  const playerCounts = new Map<string, { name: string; count: number }>();

  for (const obs of observations) {
    playerIds.add(obs.playerId);
    if (obs.impact === "positive") positive++;
    else if (obs.impact === "neutral") neutral++;
    else negative++;
    skillCounts.set(obs.skillType, (skillCounts.get(obs.skillType) ?? 0) + 1);
    const existing = playerCounts.get(obs.playerId);
    if (existing) {
      existing.count++;
    } else {
      playerCounts.set(obs.playerId, { name: obs.playerName, count: 1 });
    }
  }

  const topSkills = Array.from(skillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  const topPlayers = Array.from(playerCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([playerId, { name }]) => ({ playerId, playerName: name }));

  const maxPlayerShare =
    total > 0
      ? Math.max(...Array.from(playerCounts.values()).map((p) => p.count / total))
      : 0;
  const attentionSkewed =
    total >= 3 && maxPlayerShare >= ATTENTION_SKEW_THRESHOLD;

  let summaryLine: string;
  if (total === 0) {
    summaryLine = "Пока нет данных по тренировке";
  } else if (total <= 2) {
    summaryLine = "Пока данных по тренировке мало";
  } else if (attentionSkewed) {
    summaryLine = "Пока большая часть наблюдений по одному игроку";
  } else if (positive > neutral + negative && positive >= total * 0.5) {
    summaryLine = "Большая часть наблюдений позитивная";
  } else if (topSkills.length >= 2 && total >= 4) {
    const [a, b] = topSkills.map((s) => SKILL_NAMES_INFLECTED[s] ?? s);
    summaryLine = `Фокус на ${a} и ${b}`;
  } else if (playerIds.size >= 3) {
    summaryLine = "Внимание распределено между несколькими игроками";
  } else if (topSkills.length >= 1) {
    const top = SKILL_NAMES_INFLECTED[topSkills[0] as string] ?? topSkills[0];
    summaryLine = `Фокус на ${top}`;
  } else {
    summaryLine = "Данные по тренировке накапливаются";
  }

  return {
    total,
    uniquePlayers: playerIds.size,
    positive,
    neutral,
    negative,
    topSkills,
    topPlayers,
    summaryLine,
    attentionSkewed,
  };
}
