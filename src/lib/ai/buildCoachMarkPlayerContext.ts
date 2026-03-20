/**
 * Собирает компактный player context для Coach Mark.
 * Используй только когда playerContext передан — не придумывай данные.
 */

export interface CoachMarkPlayerContext {
  id: string;
  name?: string;
  age?: number;
  birthYear?: number;
  position?: string;
  team?: string;
  stats?: {
    games?: number;
    goals?: number;
    assists?: number;
    points?: number;
  };
  aiAnalysis?: {
    summary?: string;
    score?: number;
    strengths?: string[];
    growthAreas?: string[];
  };
}

/**
 * Формирует компактную строку контекста игрока для system prompt.
 * Возвращает пустую строку, если контекст пустой или невалидный.
 */
export function buildCoachMarkPlayerContext(
  ctx: CoachMarkPlayerContext | null | undefined
): string {
  if (!ctx || typeof ctx !== "object") return "";

  const parts: string[] = [];

  if (ctx.name?.trim()) parts.push(`Имя: ${ctx.name.trim()}`);
  if (ctx.age != null && ctx.age > 0) parts.push(`Возраст: ${ctx.age}`);
  if (ctx.birthYear != null && ctx.birthYear > 0)
    parts.push(`Год рождения: ${ctx.birthYear}`);
  if (ctx.position?.trim()) parts.push(`Позиция: ${ctx.position.trim()}`);
  if (ctx.team?.trim()) parts.push(`Команда: ${ctx.team.trim()}`);

  if (ctx.stats && typeof ctx.stats === "object") {
    const s = ctx.stats;
    const statParts: string[] = [];
    if (s.games != null) statParts.push(`${s.games} игр`);
    if (s.goals != null) statParts.push(`${s.goals} голов`);
    if (s.assists != null) statParts.push(`${s.assists} передач`);
    if (s.points != null) statParts.push(`${s.points} очков`);
    if (statParts.length > 0) parts.push(`Статистика: ${statParts.join(", ")}`);
  }

  if (ctx.aiAnalysis && typeof ctx.aiAnalysis === "object") {
    const a = ctx.aiAnalysis;
    if (a.summary?.trim()) parts.push(`AI-анализ: ${a.summary.trim()}`);
    if (a.score != null) parts.push(`Оценка: ${a.score}`);
    if (Array.isArray(a.strengths) && a.strengths.length > 0)
      parts.push(`Сильные стороны: ${a.strengths.slice(0, 3).join("; ")}`);
    if (Array.isArray(a.growthAreas) && a.growthAreas.length > 0)
      parts.push(`Зоны роста: ${a.growthAreas.slice(0, 3).join("; ")}`);
  }

  if (parts.length === 0) return "";
  return `\n---\nДАННЫЕ ИГРОКА (используй для персонализации, не придумывай отсутствующее):\n${parts.join("\n")}`;
}
