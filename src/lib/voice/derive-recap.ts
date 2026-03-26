const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export type VoiceDerivedRecap = {
  summary: string;
  highlights: string[];
};

function normalizeHighlights(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function deriveRecapFromTranscript(params: {
  transcript: string;
}): Promise<VoiceDerivedRecap> {
  const transcript = params.transcript.trim();
  if (!transcript) {
    throw new Error("Transcript is empty");
  }
  if (!OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const prompt = [
    "Ты ассистент хоккейного тренера.",
    "Верни ТОЛЬКО JSON объекта формата:",
    '{ "summary": "краткое резюме 1-2 предложения", "highlights": ["пункт 1", "пункт 2", "пункт 3"] }',
    "Правила:",
    "- summary: максимум 260 символов, спокойный профессиональный тон.",
    "- highlights: 2-5 коротких пунктов, без технического жаргона.",
    "- язык: русский.",
    "",
    "Транскрипт:",
    transcript,
  ].join("\n");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: "Отвечай строго валидным JSON без markdown." },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI derive error: ${res.status} ${txt}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? safeJsonParse(content) : null;
  const candidate = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;

  const summary =
    candidate && typeof candidate.summary === "string" ? candidate.summary.trim() : "";
  const highlights = normalizeHighlights(candidate?.highlights);

  if (!summary) {
    throw new Error("Derived summary is empty");
  }
  return {
    summary: summary.slice(0, 260),
    highlights: highlights.length > 0 ? highlights : [summary.slice(0, 120)],
  };
}
