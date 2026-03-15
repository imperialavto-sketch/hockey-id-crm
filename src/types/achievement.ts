/**
 * Achievement types for badges system.
 */

export interface AchievementItem {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt?: string;
  progressValue?: number;
  conditionValue?: number;
  isUnlocked: boolean;
}

export interface AchievementsResponse {
  unlocked: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    unlockedAt: string;
  }>;
  locked: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    progressValue?: number;
    conditionValue?: number;
  }>;
}
