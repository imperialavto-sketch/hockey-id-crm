/**
 * Live Skill Session Stats — stats for selected skill in current session
 */

import type { SessionObservation } from "@/models/sessionObservation";
import type { SkillType } from "@/models/playerDevelopment";

export interface SkillSessionStats {
  skillType: SkillType;
  total: number;
  uniquePlayers: number;
  positive: number;
  neutral: number;
  negative: number;
  topPlayers: Array<{ playerId: string; playerName: string }>;
  summaryLine: string;
}

export function getLiveSkillSessionStats(
  skillType: SkillType,
  observations: SessionObservation[]
): SkillSessionStats {
  const skillObs = observations.filter((o) => o.skillType === skillType);
  const total = skillObs.length;

  const playerIds = new Set<string>();
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  const playerCounts = new Map<string, { name: string; count: number }>();

  for (const obs of skillObs) {
    playerIds.add(obs.playerId);
    if (obs.impact === "positive") positive++;
    else if (obs.impact === "neutral") neutral++;
    else negative++;

    const existing = playerCounts.get(obs.playerId);
    if (existing) {
      existing.count++;
    } else {
      playerCounts.set(obs.playerId, { name: obs.playerName, count: 1 });
    }
  }

  const topPlayers = Array.from(playerCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([playerId, { name }]) => ({ playerId, playerName: name }));

  let summaryLine: string;
  if (total === 0) {
    summaryLine = "Пока нет наблюдений по этому навыку";
  } else if (total <= 2) {
    summaryLine = "Пока данных по навыку мало";
  } else if (total >= 5 && playerIds.size >= 3) {
    summaryLine = "Навык часто отмечается";
  } else if (positive > neutral + negative) {
    summaryLine = "Есть позитивные сигналы";
  } else if (negative > positive + neutral) {
    summaryLine = "Есть моменты для разбора";
  } else if (positive > 0 && negative > 0) {
    summaryLine = "Есть смешанная динамика";
  } else if (neutral >= total * 0.7) {
    summaryLine = "В основном нейтральные оценки";
  } else {
    summaryLine = "Данные по навыку накапливаются";
  }

  return {
    skillType,
    total,
    uniquePlayers: playerIds.size,
    positive,
    neutral,
    negative,
    topPlayers,
    summaryLine,
  };
}
