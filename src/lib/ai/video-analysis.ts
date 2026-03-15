/**
 * AI Video Analysis — generates analysis from hockey training video.
 * Uses mock analysis when no AI service is configured.
 */

export interface VideoAnalysisInput {
  playerName: string;
  playerTeam: string;
  videoDescription?: string;
  exerciseType?: string;
}

export interface VideoAnalysisOutput {
  summary: string;
  strengths: string[];
  growthAreas: string[];
  recommendations: string[];
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function analyzeVideo(input: VideoAnalysisInput): Promise<VideoAnalysisOutput> {
  if (OPENAI_API_KEY?.trim()) {
    try {
      return await generateWithLLM(input);
    } catch (err) {
      console.warn("Video analysis LLM failed, using mock:", err);
    }
  }
  return generateMockAnalysis(input);
}

async function generateWithLLM(input: VideoAnalysisInput): Promise<VideoAnalysisOutput> {
  const prompt = `Проанализируй хоккейную тренировку.
Игрок: ${input.playerName}, команда: ${input.playerTeam}${input.exerciseType ? `, тип: ${input.exerciseType}` : ""}.
${input.videoDescription ? `Описание видео: ${input.videoDescription}` : ""}

Дай JSON с ключами: summary (краткий вывод), strengths (массив сильных сторон), growthAreas (массив зон роста), recommendations (массив рекомендаций).
Язык: русский.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Ты — хоккейный аналитик. Анализируешь технику юных игроков по видео. Отвечай только валидным JSON.",
        },
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
  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    strengths: Array.isArray(parsed.strengths)
      ? (parsed.strengths as string[]).filter((s) => typeof s === "string")
      : [],
    growthAreas: Array.isArray(parsed.growthAreas)
      ? (parsed.growthAreas as string[]).filter((s) => typeof s === "string")
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? (parsed.recommendations as string[]).filter((s) => typeof s === "string")
      : [],
  };
}

function generateMockAnalysis(input: VideoAnalysisInput): VideoAnalysisOutput {
  const { playerName, playerTeam, exerciseType } = input;
  const exercise = exerciseType || "тренировка";

  return {
    summary: `На видео зафиксирована ${exercise} игрока ${playerName} (${playerTeam}). Виден хороший базовый уровень техники и потенциал для развития. Рекомендуется уделить внимание нескольким техническим аспектам.`,
    strengths: [
      "Активная работа ног",
      "Хороший контроль шайбы",
      "Правильная стойка при катании",
      "Готовность к развитию",
    ],
    growthAreas: [
      "Стартовая скорость и взрыв",
      "Точность броска в движении",
      "Работа корпусом при дриблинге",
      "Позиционирование в обороне",
    ],
    recommendations: [
      "Добавить упражнения на ускорение с места",
      "Тренировать бросок после 2–3 шагов",
      "Укреплять мышцы кора для баланса",
      "Работать над чтением игры в своей зоне",
    ],
  };
}
