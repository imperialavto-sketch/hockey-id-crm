/**
 * Player Development System — Phase 1
 * Tracks skills, trends, and confidence (local state + types only)
 */

// ----------------------------------------
// 1. TYPES
// ----------------------------------------

export enum SkillType {
  skating = "skating",
  shooting = "shooting",
  passing = "passing",
  positioning = "positioning",
  defense = "defense",
  effort = "effort",
  confidence = "confidence",
  communication = "communication",
}

export type Trend = "up" | "down" | "stable";

export interface PlayerSkill {
  score: number;
  trend: Trend;
  confidence: number;
  history: number[];
}

export type PlayerSkillsMap = Record<SkillType, PlayerSkill>;

export interface PlayerDevelopmentState {
  playerId: string;
  skills: PlayerSkillsMap;
  lastUpdatedAt: number;
}

// ----------------------------------------
// 2. DEFAULT STATE
// ----------------------------------------

export function createDefaultPlayerSkills(): PlayerSkillsMap {
  const createDefaultSkill = (): PlayerSkill => ({
    score: 60,
    trend: "stable",
    confidence: 0.2,
    history: [],
  });

  return {
    [SkillType.skating]: createDefaultSkill(),
    [SkillType.shooting]: createDefaultSkill(),
    [SkillType.passing]: createDefaultSkill(),
    [SkillType.positioning]: createDefaultSkill(),
    [SkillType.defense]: createDefaultSkill(),
    [SkillType.effort]: createDefaultSkill(),
    [SkillType.confidence]: createDefaultSkill(),
    [SkillType.communication]: createDefaultSkill(),
  };
}

// ----------------------------------------
// 3. UPDATE LOGIC
// ----------------------------------------

export function updatePlayerSkill(
  skill: PlayerSkill,
  impact: "positive" | "negative" | "neutral"
): PlayerSkill {
  const delta =
    impact === "positive" ? 2 : impact === "negative" ? -2 : 0;

  const newScore = Math.max(0, Math.min(100, skill.score + delta));

  const newHistory = [...skill.history, delta].slice(-10);

  return {
    ...skill,
    score: newScore,
    history: newHistory,
  };
}

// ----------------------------------------
// 4. TREND CALCULATION
// ----------------------------------------

export function calculateTrend(history: number[]): Trend {
  const last3 = history.slice(-3);
  const sum = last3.reduce((a, b) => a + b, 0);

  if (sum > 1) return "up";
  if (sum < -1) return "down";
  return "stable";
}

// ----------------------------------------
// 5. CONFIDENCE CALCULATION
// ----------------------------------------

export function calculateConfidence(history: number[]): number {
  const count = history.length;

  if (count <= 2) return 0.2;
  if (count <= 5) return 0.5;
  return 0.8;
}

// ----------------------------------------
// 6. FINAL UPDATE FUNCTION
// ----------------------------------------

export function applySkillUpdate(
  skills: PlayerSkillsMap,
  skillType: SkillType,
  impact: "positive" | "negative" | "neutral"
): PlayerSkillsMap {
  const skill = skills[skillType];

  const updated = updatePlayerSkill(skill, impact);
  const trend = calculateTrend(updated.history);
  const confidence = calculateConfidence(updated.history);

  const updatedSkill: PlayerSkill = {
    ...updated,
    trend,
    confidence,
  };

  return {
    ...skills,
    [skillType]: updatedSkill,
  };
}

// ----------------------------------------
// 7. TEST / USAGE EXAMPLE
// ----------------------------------------

if (__DEV__) {
  (function devExample() {
    const skills = createDefaultPlayerSkills();

    let current = skills;
    current = applySkillUpdate(current, SkillType.skating, "positive");
    current = applySkillUpdate(current, SkillType.skating, "positive");
    current = applySkillUpdate(current, SkillType.skating, "negative");

    // Expected: score 62, trend "up" (2+2-2=2 > 1), confidence 0.5 (3 entries)
  })();
}
