/**
 * Evaluate player achievements from current data.
 * Returns unlocked and locked achievements with progress.
 */

import { ACHIEVEMENT_DEFINITIONS } from "./definitions";

export interface PlayerDataForEvaluation {
  stats?: {
    games: number;
    goals: number;
    assists: number;
    points: number;
  } | null;
  attendancePercent?: number | null;
  progressHistory?: Array<{ trend?: string }>;
  manualAchievements?: Array<{ id: string; title: string; description?: string | null; createdAt: Date }>;
}

export interface UnlockedAchievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt: string;
}

export interface LockedAchievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  progressValue?: number;
  conditionValue?: number;
}

export interface AchievementsResponse {
  unlocked: UnlockedAchievement[];
  locked: LockedAchievement[];
}

function getCurrentValue(
  def: (typeof ACHIEVEMENT_DEFINITIONS)[0],
  data: PlayerDataForEvaluation
): number {
  const stats = data.stats;
  switch (def.conditionType) {
    case "goals":
      return stats?.goals ?? 0;
    case "assists":
      return stats?.assists ?? 0;
    case "points":
      return stats?.points ?? 0;
    case "gamesPlayed":
      return stats?.games ?? 0;
    case "attendancePercent":
      return data.attendancePercent ?? 0;
    case "progressMonths": {
      const history = data.progressHistory ?? [];
      let streak = 0;
      for (let i = 0; i < history.length; i++) {
        if (history[i].trend === "up") streak++;
        else break;
      }
      return streak;
    }
    default:
      return 0;
  }
}

export function evaluatePlayerAchievements(
  playerId: string,
  data: PlayerDataForEvaluation
): AchievementsResponse {
  const unlocked: UnlockedAchievement[] = [];
  const locked: LockedAchievement[] = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (def.conditionType === "manual" || def.conditionType === "coachAssigned") continue;

    const current = getCurrentValue(def, data);
    const required = def.conditionValue;
    const isUnlocked = current >= required;

    const item = {
      id: `rule-${def.code}`,
      code: def.code,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
    };

    if (isUnlocked) {
      unlocked.push({
        ...item,
        unlockedAt: new Date().toISOString(),
      });
    } else {
      locked.push({
        ...item,
        progressValue: current > 0 ? current : undefined,
        conditionValue: required,
      });
    }
  }

  // Add manual/coach achievements as unlocked
  for (const m of data.manualAchievements ?? []) {
    unlocked.push({
      id: m.id,
      code: "manual",
      title: m.title,
      description: m.description ?? "Персональное достижение от тренера",
      icon: "trophy",
      category: "coach",
      unlockedAt: new Date(m.createdAt).toISOString(),
    });
  }

  // Sort: unlocked by date (newest first), locked by progress (closest first)
  unlocked.sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime());
  locked.sort((a, b) => {
    const progA = a.progressValue ?? 0;
    const progB = b.progressValue ?? 0;
    return progB - progA;
  });

  return { unlocked, locked };
}
