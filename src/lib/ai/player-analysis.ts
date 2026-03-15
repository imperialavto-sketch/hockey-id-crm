/**
 * AI Hockey Analyst — analysis generator.
 * Uses fallback template generator when no LLM is configured.
 * Structure allows plugging in OpenAI/other provider later.
 */

import type { PlayerAIAnalysis } from "@/types/ai-analysis";
import type { PlayerDataForPrompt } from "./prompts";
import { buildAnalysisPrompt } from "./prompts";

export interface PlayerAnalysisInput {
  player: {
    firstName: string;
    lastName: string;
    birthYear: number;
    position: string;
    team?: { name: string } | null;
  };
  latestStat?: {
    season: string;
    games: number;
    goals: number;
    assists: number;
    points: number;
    pim: number;
  } | null;
  attendances?: { status: string }[];
  coachRatings?: { recommendation: string | null; comment: string | null }[];
  notes?: { note: string }[];
  skills?: {
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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Generate AI analysis. Uses LLM if configured, otherwise fallback templates.
 */
export async function generatePlayerAnalysis(
  input: PlayerAnalysisInput
): Promise<PlayerAIAnalysis> {
  if (OPENAI_API_KEY?.trim()) {
    try {
      return await generateWithLLM(input);
    } catch (err) {
      console.warn("AI analysis LLM failed, using fallback:", err);
    }
  }
  return generateFallback(input);
}

function buildPromptData(input: PlayerAnalysisInput): PlayerDataForPrompt {
  const present =
    input.attendances?.filter((a) => a.status === "PRESENT").length ?? 0;
  const total = input.attendances?.length ?? 0;

  const coachRecommendations = (input.coachRatings ?? [])
    .map((r) => r.recommendation ?? r.comment)
    .filter((s): s is string => Boolean(s?.trim()));

  const coachNotes = (input.notes ?? []).map((n) => n.note.trim()).filter(Boolean);

  return {
    firstName: input.player.firstName,
    lastName: input.player.lastName,
    birthYear: input.player.birthYear,
    position: input.player.position,
    teamName: input.player.team?.name ?? null,
    statsSummary: input.latestStat
      ? {
          games: input.latestStat.games,
          goals: input.latestStat.goals,
          assists: input.latestStat.assists,
          points: input.latestStat.points,
          pim: input.latestStat.pim,
          season: input.latestStat.season,
        }
      : null,
    attendanceSummary:
      total > 0
        ? {
            total,
            present,
            presentPercent: Math.round((present / total) * 100),
          }
        : null,
    coachRecommendations,
    coachNotes,
    skillsSummary: input.skills ?? undefined,
    progressHistory: input.progressHistory,
  };
}

async function generateWithLLM(
  input: PlayerAnalysisInput
): Promise<PlayerAIAnalysis> {
  const data = buildPromptData(input);
  const prompt = buildAnalysisPrompt(data);

  const systemPrompt = `Ты — опытный хоккейный аналитик. Твоя задача — дать структурированный анализ развития юного игрока для родителя.
Ответь строго в формате JSON с ключами: summary, strengths (массив строк), growthAreas (массив строк), recommendations (массив строк), coachFocus (строка), motivation (строка).
Язык: русский. Без медицинских выводов, без гарантий карьеры. Поддерживающий тон.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");

  const parsed = JSON.parse(content) as Record<string, unknown>;
  return normalizeAnalysis(parsed);
}

function normalizeAnalysis(raw: Record<string, unknown>): PlayerAIAnalysis {
  return {
    summary: typeof raw.summary === "string" ? raw.summary : "",
    strengths: Array.isArray(raw.strengths) ? raw.strengths.filter((s): s is string => typeof s === "string") : [],
    growthAreas: Array.isArray(raw.growthAreas) ? raw.growthAreas.filter((s): s is string => typeof s === "string") : [],
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations.filter((s): s is string => typeof s === "string") : [],
    coachFocus: typeof raw.coachFocus === "string" ? raw.coachFocus : "",
    motivation: typeof raw.motivation === "string" ? raw.motivation : "",
  };
}

/**
 * Template-based fallback — works without any LLM.
 */
function generateFallback(input: PlayerAnalysisInput): PlayerAIAnalysis {
  const name = `${input.player.firstName} ${input.player.lastName}`;
  const stat = input.latestStat;
  const age = new Date().getFullYear() - input.player.birthYear;

  const strengths: string[] = [];
  const growthAreas: string[] = [];
  const recommendations: string[] = [];

  if (stat) {
    if (stat.goals >= 8 || stat.points >= 15) {
      strengths.push("Хорошее голевое чутьё");
      strengths.push("Активность в атаке");
    }
    if (stat.assists >= 5) {
      strengths.push("Неплохое понимание эпизода");
      strengths.push("Командная игра");
    }
    if (stat.games >= 15 && stat.points > 0) {
      strengths.push("Регулярная результативность");
    }
    if (stat.pim <= 6) {
      strengths.push("Дисциплинированность на площадке");
    }
  }

  if (strengths.length === 0) {
    strengths.push("Готовность к развитию");
    strengths.push("Потенциал для роста");
  }

  growthAreas.push("Стартовая скорость");
  growthAreas.push("Стабильность катания");
  growthAreas.push("Точность завершения атак");

  recommendations.push("Уделить внимание ускорению на первых шагах");
  recommendations.push("Добавить упражнения на баланс и контроль корпуса");
  recommendations.push("Тренировать бросок после движения");

  const coachRecs = (input.coachRatings ?? [])
    .map((r) => r.recommendation ?? r.comment)
    .filter((s): s is string => Boolean(s?.trim()));
  if (coachRecs.length > 0) {
    recommendations.length = 0;
    recommendations.push(...coachRecs.slice(0, 4));
  }

  const attendanceTotal = input.attendances?.length ?? 0;
  const attendancePresent = input.attendances?.filter((a) => a.status === "PRESENT").length ?? 0;
  const attendancePct = attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 100) : 100;

  const progress = input.progressHistory ?? [];
  const recentTrends = progress.filter((p) => p.trend === "up").length;
  const stableTrends = progress.filter((p) => p.trend === "stable").length;
  const pointsIncreasing = progress.length >= 2 && progress[0].points >= (progress[1]?.points ?? 0);

  let summary = `${name} показывает хорошую вовлечённость в тренировочный процесс`;
  if (stat) {
    summary += `. В текущем сезоне: ${stat.games} игр, ${stat.goals} голов, ${stat.assists} передач (${stat.points} очков).`;
  } else {
    summary += ".";
  }
  if (attendanceTotal > 0) {
    summary += ` Посещаемость тренировок: ${attendancePct}%.`;
  }
  if (recentTrends > 0 && pointsIncreasing) {
    summary += " По истории прогресса виден позитивный тренд в развитии.";
  } else if (stableTrends > 0 && progress.length > 0) {
    summary += " Развитие стабильное, с возможностью целенаправленного роста.";
  }
  summary += " Есть зоны для целенаправленного развития.";

  const coachFocus =
    "В ближайший месяц основной акцент стоит сделать на катании и скорости старта.";

  let motivation = "При системной работе " + input.player.firstName + " может заметно прибавить уже в ближайшие 2–3 месяца.";
  if (recentTrends >= 2) {
    motivation = "Положительная динамика в последних месяцах — хороший знак. При сохранении системной работы " + input.player.firstName + " может продолжить прогресс.";
  } else if (attendancePct >= 90 && attendanceTotal > 0) {
    motivation = "Регулярная посещаемость и дисциплина создают базу для роста. " + input.player.firstName + " на верном пути.";
  }

  return {
    summary,
    strengths: strengths.slice(0, 5),
    growthAreas: growthAreas.slice(0, 4),
    recommendations: recommendations.slice(0, 5),
    coachFocus,
    motivation,
  };
}
