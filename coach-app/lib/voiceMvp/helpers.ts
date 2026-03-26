import { VOICE_MVP_SOURCE } from "./constants";
import type { VoiceCoachDraft, VoiceCoachDraftContext, VoiceUiPhase } from "./types";
import type { VoiceStarterIntent } from "./starter";

export function formatRecordingElapsed(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function voicePhaseStatusLabelRu(phase: VoiceUiPhase): string {
  switch (phase) {
    case "idle":
      return "Готово к записи";
    case "recording":
      return "Идёт запись…";
    case "processing":
      return "Готовим черновик…";
    case "ready":
      return "Черновик готов";
    case "failed":
      return "Не удалось подготовить черновик";
    default:
      return "Состояние неизвестно";
  }
}

export function voicePhaseCardTitleRu(phase: VoiceUiPhase): string {
  switch (phase) {
    case "idle":
      return "Голосовая заметка";
    case "recording":
      return "Запись";
    case "processing":
      return "Обработка";
    case "ready":
      return "Результат";
    case "failed":
      return "Ошибка";
    default:
      return "Голос";
  }
}

export function canStartVoiceRecording(phase: VoiceUiPhase): boolean {
  return phase === "idle" || phase === "failed";
}

export function canStopVoiceRecording(phase: VoiceUiPhase): boolean {
  return phase === "recording";
}

export function canResetVoiceFlow(phase: VoiceUiPhase): boolean {
  return phase === "processing" || phase === "ready";
}

export type VoiceIntentSuggestion = {
  intent: VoiceStarterIntent;
  label: string;
  score: number;
};

export type VoiceTranscriptAnalysis = {
  summary: string;
  highlights: string[];
  suggestions: VoiceIntentSuggestion[];
};

const INTENT_LABELS: Record<VoiceStarterIntent, string> = {
  coach_note: "Заметка тренера",
  parent_draft: "Сообщение родителю",
  report_draft: "Черновик отчёта",
  action_item: "Задача / действие",
};

const INTENT_KEYWORDS: Record<VoiceStarterIntent, string[]> = {
  coach_note: [
    "техника",
    "катание",
    "брос",
    "передач",
    "позици",
    "прогресс",
    "тренировк",
    "сесси",
  ],
  parent_draft: [
    "родител",
    "сообщени",
    "домашн",
    "объяснит",
    "пап",
    "мам",
  ],
  report_draft: ["отч", "итог", "резюме", "сводк", "недел"],
  action_item: [
    "нужно",
    "надо",
    "задач",
    "план",
    "сделать",
    "следующ",
    "добавить",
    "проверить",
  ],
};

function splitSentencesRu(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function trimForSummary(s: string, max = 220): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

function pickHighlights(transcript: string): string[] {
  const fromBullets = transcript
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-") || l.startsWith("•") || l.startsWith("*"))
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  if (fromBullets.length > 0) return fromBullets.slice(0, 4);

  const sentences = splitSentencesRu(transcript)
    .filter((s) => s.length >= 12)
    .slice(0, 4)
    .map((s) => trimForSummary(s, 120));
  return sentences.length > 0
    ? sentences
    : ["Зафиксировать ключевое наблюдение", "Определить следующий шаг"];
}

function detectIntentSuggestions(transcript: string): VoiceIntentSuggestion[] {
  const low = transcript.toLowerCase();
  const suggestions = (Object.keys(INTENT_KEYWORDS) as VoiceStarterIntent[]).map(
    (intent) => {
      const score = INTENT_KEYWORDS[intent].reduce(
        (acc, kw) => acc + (low.includes(kw) ? 1 : 0),
        0
      );
      return {
        intent,
        label: INTENT_LABELS[intent],
        score,
      };
    }
  );

  suggestions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable fallback priority for MVP UX.
    const order: Record<VoiceStarterIntent, number> = {
      coach_note: 0,
      parent_draft: 1,
      report_draft: 2,
      action_item: 3,
    };
    return order[a.intent] - order[b.intent];
  });

  return suggestions;
}

export function analyzeVoiceTranscriptRu(transcriptRaw: string): VoiceTranscriptAnalysis {
  const transcript = transcriptRaw.trim();
  if (!transcript) {
    return {
      summary: "Пока нет текста расшифровки.",
      highlights: ["Сделайте запись ещё раз и повторите загрузку аудио."],
      suggestions: detectIntentSuggestions(""),
    };
  }

  const sentences = splitSentencesRu(transcript);
  const summary =
    sentences.length >= 2
      ? trimForSummary(`${sentences[0]} ${sentences[1]}`)
      : trimForSummary(sentences[0] ?? transcript);

  return {
    summary,
    highlights: pickHighlights(transcript),
    suggestions: detectIntentSuggestions(transcript),
  };
}

export function formatVoiceDraftDateTimeRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatVoiceDateTimeCompactRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatVoiceDateTimeFullRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Человекочитаемая подпись источника для UI */
export function voiceMvpSourceLabelRu(): string {
  return "Голосовая заметка";
}

export type VoiceDraftContextRow = { label: string; value: string };

/** Строки блока контекста на экране готового черновика */
export function voiceDraftContextRows(draft: VoiceCoachDraft): VoiceDraftContextRow[] {
  const ctx = draft.context;
  const sessionLocal =
    ctx?.sessionStartedAt != null
      ? formatVoiceDraftDateTimeRu(new Date(ctx.sessionStartedAt).toISOString())
      : null;

  const rows: VoiceDraftContextRow[] = [
    {
      label: "Команда",
      value: ctx?.teamLabel?.trim() ? ctx.teamLabel.trim() : "Не указана",
    },
    {
      label: "Тренировка / сессия",
      value: ctx?.sessionHint?.trim() ? ctx.sessionHint.trim() : "Без названия",
    },
    {
      label: "Игрок",
      value: ctx?.playerLabel?.trim() ? ctx.playerLabel.trim() : "Не выбран",
    },
    {
      label: "Дата и время заметки",
      value: formatVoiceDraftDateTimeRu(draft.createdAt),
    },
  ];

  if (sessionLocal) {
    rows.push({
      label: "Черновик сессии (старт)",
      value: sessionLocal,
    });
  }

  rows.push({
    label: "Источник",
    value: `${voiceMvpSourceLabelRu()} · ${draft.source}`,
  });

  return rows;
}

let draftIdSeq = 0;

export function buildMockVoiceDraft(params: {
  recordingDurationSec: number;
  createdAt: Date;
  context?: VoiceCoachDraftContext;
}): VoiceCoachDraft {
  const { recordingDurationSec, createdAt, context } = params;
  const dur = formatRecordingElapsed(recordingDurationSec);
  const transcript = [
    "[MVP] Условная расшифровка голоса — здесь позже появится текст от провайдера речи.",
    `Длительность записи: ${dur}.`,
    context?.teamLabel?.trim()
      ? `Команда (контекст): ${context.teamLabel.trim()}.`
      : null,
    context?.sessionHint?.trim()
      ? `Сессия: ${context.sessionHint.trim()}.`
      : null,
    context?.playerLabel
      ? `Игрок: ${context.playerLabel}.`
      : "Игрок в контексте не задан — можно будет привязать позже.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const analysis = analyzeVoiceTranscriptRu(transcript);

  return {
    id: `voice_draft_${Date.now()}_${++draftIdSeq}`,
    createdAt: createdAt.toISOString(),
    source: VOICE_MVP_SOURCE,
    transcript,
    summary: analysis.summary,
    extractedPoints: analysis.highlights,
    recordingDurationSec,
    context,
  };
}
