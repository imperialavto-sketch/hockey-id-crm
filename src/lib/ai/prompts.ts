/**
 * AI Hockey Analyst — prompt builder for LLM.
 * Builds a structured prompt from player data for future OpenAI/LLM integration.
 */

export interface PlayerDataForPrompt {
  firstName: string;
  lastName: string;
  birthYear: number;
  position: string;
  teamName: string | null;
  statsSummary: {
    games: number;
    goals: number;
    assists: number;
    points: number;
    pim: number;
    season?: string;
  } | null;
  attendanceSummary: {
    total: number;
    present: number;
    presentPercent: number;
  } | null;
  coachRecommendations: string[];
  coachNotes: string[];
  skillsSummary?: {
    speed: number | null;
    shotAccuracy: number | null;
    dribbling: number | null;
    stamina: number | null;
  } | null;
  progressHistory?: Array<{
    month: number;
    year: number;
    games: number;
    goals: number;
    assists: number;
    points: number;
    attendancePercent?: number;
    coachComment?: string;
    focusArea?: string;
    trend?: string;
  }>;
}

export const STYLE_INSTRUCTIONS = `
Стиль и ограничения:
- Пиши на русском языке.
- Тон: профессиональный, поддерживающий, мотивирующий.
- Аудитория: родитель юного хоккеиста.
- Не давай нереалистичных обещаний.
- Не делай медицинских выводов и не ставь диагнозы.
- Не гарантируй карьеру в профессиональном хоккее.
- Избегай жёсткой критики.
- Рекомендации должны быть конкретными и практичными.
- Будь реалистичным и поддерживающим.
`.trim();

export function buildAnalysisPrompt(data: PlayerDataForPrompt): string {
  const lines: string[] = [
    "Сгенерируй краткий AI-анализ развития юного хоккеиста для родителя.",
    "",
    "## Профиль игрока",
    `Имя: ${data.firstName} ${data.lastName}`,
    `Год рождения: ${data.birthYear}`,
    `Позиция: ${data.position}`,
    `Команда: ${data.teamName ?? "не указана"}`,
    "",
  ];

  if (data.statsSummary) {
    const s = data.statsSummary;
    lines.push(
      "## Статистика (последний сезон)",
      `Игры: ${s.games}, Голы: ${s.goals}, Передачи: ${s.assists}, Очки: ${s.points}, Штраф: ${s.pim} мин`,
      s.season ? `Сезон: ${s.season}` : "",
      ""
    );
  }

  if (data.attendanceSummary && data.attendanceSummary.total > 0) {
    const a = data.attendanceSummary;
    lines.push(
      "## Посещаемость",
      `Тренировок: ${a.present} из ${a.total} (${a.presentPercent}%)`,
      ""
    );
  }

  if (data.skillsSummary) {
    const sk = data.skillsSummary;
    const parts = [
      sk.speed != null && `скорость: ${sk.speed}`,
      sk.shotAccuracy != null && `точность броска: ${sk.shotAccuracy}`,
      sk.dribbling != null && `дриблинг: ${sk.dribbling}`,
      sk.stamina != null && `выносливость: ${sk.stamina}`,
    ].filter(Boolean);
    if (parts.length > 0) {
      lines.push("## Навыки (оценки)", parts.join(", "), "");
    }
  }

  if (data.coachRecommendations.length > 0) {
    lines.push("## Рекомендации тренера", ...data.coachRecommendations.map((r) => `- ${r}`), "");
  }

  if (data.coachNotes.length > 0) {
    lines.push("## Заметки тренера", ...data.coachNotes.map((n) => `- ${n}`), "");
  }

  if (data.progressHistory && data.progressHistory.length > 0) {
    lines.push("## История прогресса (помесячно)", "");
    data.progressHistory.slice(0, 6).forEach((p) => {
      const parts = [`${p.month}/${p.year}: игры ${p.games}, голы ${p.goals}, передачи ${p.assists}, очки ${p.points}`];
      if (p.attendancePercent != null) parts.push(`посещаемость ${p.attendancePercent}%`);
      if (p.trend) parts.push(`тренд: ${p.trend}`);
      if (p.focusArea) parts.push(`фокус: ${p.focusArea}`);
      if (p.coachComment) parts.push(`комментарий: ${p.coachComment}`);
      lines.push(parts.join("; "));
    });
    lines.push("");
  }

  lines.push("---", STYLE_INSTRUCTIONS);
  return lines.filter((l) => l !== undefined).join("\n");
}
