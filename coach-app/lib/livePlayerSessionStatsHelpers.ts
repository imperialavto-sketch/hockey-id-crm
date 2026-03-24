/**
 * Live Player Session Stats — stats for selected player in current session
 */

import type { SessionObservation } from "@/models/sessionObservation";
import type { SkillType } from "@/models/playerDevelopment";

export interface PlayerSessionStats {
  playerName: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  skillsNoted: SkillType[];
  summaryLine: string;
}

export function getLivePlayerSessionStats(
  playerId: string,
  playerName: string,
  observations: SessionObservation[]
): PlayerSessionStats {
  const playerObs = observations.filter((o) => o.playerId === playerId);
  const total = playerObs.length;

  let positive = 0;
  let neutral = 0;
  let negative = 0;
  const skillCounts = new Map<SkillType, number>();

  for (const obs of playerObs) {
    if (obs.impact === "positive") positive++;
    else if (obs.impact === "neutral") neutral++;
    else negative++;
    skillCounts.set(obs.skillType, (skillCounts.get(obs.skillType) ?? 0) + 1);
  }

  const skillsNoted = Array.from(skillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  let summaryLine: string;
  if (total === 0) {
    summaryLine = "Пока нет наблюдений по этому игроку";
  } else if (total <= 2) {
    summaryLine = "Пока наблюдений мало";
  } else if (positive > neutral + negative) {
    summaryLine = "Есть позитивные сигналы";
  } else if (negative > positive + neutral) {
    summaryLine = "Есть моменты для работы";
  } else if (positive > 0 && negative > 0) {
    summaryLine = "Есть смешанная динамика";
  } else if (neutral >= total * 0.7) {
    summaryLine = "Нужен дополнительный контекст";
  } else {
    summaryLine = "Данные по игроку накапливаются";
  }

  return {
    playerName,
    total,
    positive,
    neutral,
    negative,
    skillsNoted,
    summaryLine,
  };
}
