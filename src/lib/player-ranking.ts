/**
 * Player Ranking Engine — рейтинг игроков на основе CRM данных
 */

import { calculatePlayerDevelopment } from "./player-ai";
import type { PlayerForAI } from "./player-ai";

export interface PlayerForRanking extends PlayerForAI {
  achievements?: { id: string }[];
}

export interface RankingResult {
  rankingScore: number;
  developmentIndex: number;
  statsScore: number;
  attendanceScore: number;
  coachRatingScore: number;
  achievementScore: number;
}

/**
 * Баллы за достижения: количество * 10, максимум 100
 */
function calculateAchievementScore(achievements: { id: string }[] | undefined): number {
  if (!achievements || achievements.length === 0) return 0;
  return Math.min(100, achievements.length * 10);
}

/**
 * Рассчитывает рейтинг игрока по формуле:
 * rankingScore =
 *   developmentIndex * 0.4 +
 *   statsScore * 0.2 +
 *   attendanceScore * 0.15 +
 *   coachRatingScore * 0.15 +
 *   achievementScore * 0.1
 */
export function calculatePlayerRanking(player: PlayerForRanking): RankingResult {
  const dev = calculatePlayerDevelopment({
    skills: player.skills,
    coachRatings: player.coachRatings,
    attendances: player.attendances,
    stats: player.stats,
  });

  const achievementScore = calculateAchievementScore(player.achievements);

  const rankingScore =
    dev.developmentIndex * 0.4 +
    dev.statsScore * 0.2 +
    dev.attendanceScore * 0.15 +
    dev.coachRatingScore * 0.15 +
    achievementScore * 0.1;

  return {
    rankingScore: Math.round(rankingScore * 10) / 10,
    developmentIndex: dev.developmentIndex,
    statsScore: dev.statsScore,
    attendanceScore: dev.attendanceScore,
    coachRatingScore: dev.coachRatingScore,
    achievementScore: Math.round(achievementScore * 10) / 10,
  };
}
