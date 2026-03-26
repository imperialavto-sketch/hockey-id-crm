/**
 * Детерминированный разбор транскрипта заметки (сервер).
 * Смыслово совпадает с coach-app/lib/ai/voiceProcessing.ts (локальный mock);
 * при появлении внешнего провайдера заменить тело {@link analyzeVoiceNoteTranscript}.
 */

export type VoiceNoteAnalysisInput = {
  text: string;
  playerName?: string;
};

export type VoiceNoteAnalysisResult = {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  actions: { title: string; priority?: "low" | "medium" | "high" }[];
  parentDraft: string;
};

const STRENGTH_MARKERS = [
  "хорошо",
  "сильно",
  "отлично",
  "сильная",
  "сильный",
  "молодец",
  "прогресс",
  "стабильно",
  "уверенно",
];

const IMPROVEMENT_MARKERS = [
  "нужно",
  "слабое",
  "слабый",
  "слабая",
  "ошибка",
  "ошибки",
  "проблем",
  "отстаёт",
  "отстает",
  "не хватает",
  "недостаточно",
];

const RECOMMENDATION_MARKERS = ["рекомендую", "стоит", "предлагаю", "важно", "лучше бы"];

const HIGH_PRIORITY_MARKERS = ["срочно", "важно", "обязательно", "критично", "немедленно"];
const LOW_PRIORITY_MARKERS = ["по возможности", "когда будет время", "не срочно", "позже"];

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string): string[] {
  const cleaned = normalizeWhitespace(text);
  if (!cleaned) return [];
  const parts = cleaned.split(/(?<=[.!?…])\s+/);
  return parts.map((p) => normalizeWhitespace(p)).filter(Boolean);
}

function firstSentences(sentences: string[], max: number): string {
  const take = sentences.slice(0, Math.min(max, sentences.length));
  return take.join(" ").trim() || sentences[0]?.trim() || "";
}

function containsAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

function inferPriority(line: string): "low" | "medium" | "high" | undefined {
  const lower = line.toLowerCase();
  if (HIGH_PRIORITY_MARKERS.some((m) => lower.includes(m))) return "high";
  if (LOW_PRIORITY_MARKERS.some((m) => lower.includes(m))) return "low";
  return "medium";
}

function collectByMarkers(sentences: string[], markers: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const sent of sentences) {
    if (!sent || !containsAny(sent, markers)) continue;
    const key = sent.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(sent);
  }
  return out;
}

function uniqueStrings(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = normalizeWhitespace(raw);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function titleFromLine(line: string, maxLen = 120): string {
  const t = normalizeWhitespace(line);
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

function buildActionsFromLines(
  improvements: string[],
  recommendations: string[]
): VoiceNoteAnalysisResult["actions"] {
  const raw: string[] = [...improvements, ...recommendations];
  const deduped = uniqueStrings(raw, 12);
  return deduped.map((line) => ({
    title: titleFromLine(line),
    priority: inferPriority(line),
  }));
}

function buildParentDraft(
  input: VoiceNoteAnalysisInput,
  summary: string,
  strengths: string[],
  improvements: string[],
  recommendations: string[]
): string {
  const name = input.playerName?.trim();
  const greeting = name
    ? `Здравствуйте! Кратко по ${name} после тренировки.`
    : "Здравствуйте! Кратко по итогам тренировки.";
  const lines: string[] = [greeting, ""];

  if (summary) {
    lines.push(summary);
    lines.push("");
  }

  if (strengths.length > 0) {
    lines.push("Что получилось хорошо:");
    strengths.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push("");
  }

  if (improvements.length > 0) {
    lines.push("Над чем продолжим работать:");
    improvements.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push("");
  }

  if (recommendations.length > 0) {
    lines.push("Что рекомендуем на ближайшее время:");
    recommendations.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push("");
  }

  lines.push("Если будут вопросы — напишите, обсудим.");
  return lines.join("\n").trim();
}

function analyzeNonEmpty(input: VoiceNoteAnalysisInput): VoiceNoteAnalysisResult {
  const text = normalizeWhitespace(input.text);
  const sentences = splitSentences(text);

  const summary =
    sentences.length > 0
      ? firstSentences(sentences, 2)
      : text.slice(0, 280) + (text.length > 280 ? "…" : "");

  const strengths = uniqueStrings(collectByMarkers(sentences, STRENGTH_MARKERS), 8);
  const improvements = uniqueStrings(collectByMarkers(sentences, IMPROVEMENT_MARKERS), 8);
  const recommendations = uniqueStrings(collectByMarkers(sentences, RECOMMENDATION_MARKERS), 8);

  const actions = buildActionsFromLines(improvements, recommendations);

  const parentDraft = buildParentDraft(input, summary, strengths, improvements, recommendations);

  return {
    summary: summary || "Заметка без разбора по предложениям — добавьте пару фраз о тренировке.",
    strengths,
    improvements,
    recommendations,
    actions,
    parentDraft,
  };
}

/**
 * Детерминированный разбор (без внешнего AI). Пустой текст — вызывающий код должен вернуть 400.
 */
export function analyzeVoiceNoteTranscript(input: VoiceNoteAnalysisInput): VoiceNoteAnalysisResult {
  const text = normalizeWhitespace(input.text);
  if (!text) {
    return {
      summary: "Пустая заметка — нечего обработать.",
      strengths: [],
      improvements: [],
      recommendations: [],
      actions: [],
      parentDraft:
        "Здравствуйте! Пока нет текста заметки для родителей. Когда будет готово описание тренировки, мы сможем сформировать сообщение.",
    };
  }
  return analyzeNonEmpty(input);
}
