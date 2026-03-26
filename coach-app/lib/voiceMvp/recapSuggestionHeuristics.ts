/**
 * Лёгкие эвристики для подсказок «что сделать дальше» из recap (summary / highlights / transcript).
 * Без AI и без backend.
 */

export type VoiceRecapSuggestionFlags = {
  suggestParentDraft: boolean;
  suggestAction: boolean;
  suggestReport: boolean;
};

export type VoiceRecapSuggestionKind = "parent_draft" | "action_item" | "report_draft";

export type VoiceRecapSuggestionsResult = {
  flags: VoiceRecapSuggestionFlags;
  /** Акценты с достаточной длиной — для эвристик и prefill */
  meaningfulHighlights: string[];
  /** Оценка «сколько мыслей» в тексте (строки / предложения / маркеры) */
  roughObservationCount: number;
  /** Главная рекомендация среди показанных действий */
  primary: VoiceRecapSuggestionKind | null;
  /** Мягкий сигнал релевантности без процентов */
  confidenceHint: string;
  /** Одна строка preview на действие (может быть null) */
  previews: Record<VoiceRecapSuggestionKind, string | null>;
};

const MIN_HIGHLIGHT_LEN = 12;
const MIN_SUMMARY_FOR_PARENT = 10;
const MIN_TRANSCRIPT_FALLBACK = 48;

function trimPreview(s: string, max = 88): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Уникальные по нормализованному началу строки */
function meaningfulHighlightsFrom(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    const t = x.trim();
    if (t.length < MIN_HIGHLIGHT_LEN) continue;
    const key = t.slice(0, 48).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.slice(0, 8);
}

/** Грубый подсчёт «наблюдений»: маркированные строки или разнесённые предложения */
export function roughObservationCountFromTranscript(transcript: string): number {
  const t = transcript.trim();
  if (!t) return 0;
  const bulletLines = t.split(/\n/).filter((line) => /^[-•*]\s+\S/.test(line.trim())).length;
  const sentences = t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 22);
  const uniqStarts = new Set(sentences.map((s) => s.slice(0, 36).toLowerCase()));
  const fromSentences = Math.max(uniqStarts.size, sentences.length > 0 ? 1 : 0);
  const hardBreaks = t.split(/\n\n+/).filter((b) => b.trim().length >= 28).length;
  return Math.max(bulletLines, fromSentences, hardBreaks, t.length >= 80 ? 1 : 0);
}

function pickPrimary(params: {
  flags: VoiceRecapSuggestionFlags;
  summaryLen: number;
  mhCount: number;
  roughObs: number;
}): VoiceRecapSuggestionKind | null {
  const { flags, summaryLen, mhCount, roughObs } = params;
  const candidates: VoiceRecapSuggestionKind[] = [];
  if (flags.suggestParentDraft) candidates.push("parent_draft");
  if (flags.suggestAction) candidates.push("action_item");
  if (flags.suggestReport) candidates.push("report_draft");
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  if (flags.suggestParentDraft && summaryLen >= 18) return "parent_draft";
  if (flags.suggestReport && mhCount >= 3) return "report_draft";
  if (flags.suggestReport && mhCount >= 2 && roughObs >= 3) return "report_draft";
  if (flags.suggestAction && mhCount >= 2) return "action_item";
  if (flags.suggestReport && flags.suggestParentDraft && summaryLen >= 14) return "parent_draft";
  if (flags.suggestAction) return "action_item";
  return candidates[0];
}

function confidenceHintFor(params: { roughObs: number; mhCount: number; summaryLen: number }): string {
  if (params.mhCount >= 3 || params.roughObs >= 4) {
    return "По итогам серии";
  }
  if (params.summaryLen >= 16 && params.mhCount >= 1) {
    return "На основе резюме и акцентов";
  }
  return "На основе заметки";
}

function buildPreviews(params: {
  summary: string;
  meaningfulHighlights: string[];
  transcript: string;
  flags: VoiceRecapSuggestionFlags;
}): Record<VoiceRecapSuggestionKind, string | null> {
  const { summary, meaningfulHighlights: mh, transcript, flags } = params;
  const firstHl = mh[0] ? trimPreview(mh[0], 82) : null;
  const secondHl = mh[1] ? trimPreview(mh[1], 40) : null;

  let parent: string | null = null;
  if (flags.suggestParentDraft) {
    if (summary.length >= 8) parent = trimPreview(summary, 84);
    else if (firstHl) parent = firstHl;
    else if (transcript.trim().length >= 24) parent = trimPreview(transcript, 84);
  }

  let action: string | null = null;
  if (flags.suggestAction && firstHl) action = firstHl;

  let report: string | null = null;
  if (flags.suggestReport) {
    if (mh.length >= 2 && secondHl) report = trimPreview(`${firstHl ?? ""} · ${secondHl}`, 90);
    else if (firstHl) report = firstHl;
    else if (summary.length >= 8) report = trimPreview(summary, 84);
  }

  return { parent_draft: parent, action_item: action, report_draft: report };
}

/**
 * Полный разбор подсказок: фильтрация акцентов, флаги, primary, превью.
 */
export function deriveVoiceRecapSuggestions(params: {
  summary: string | null;
  highlights: string[];
  transcript: string;
}): VoiceRecapSuggestionsResult {
  const summary = params.summary?.trim() ?? "";
  const tr = params.transcript.trim();
  const meaningfulHighlights = meaningfulHighlightsFrom(params.highlights);
  const mhCount = meaningfulHighlights.length;
  const roughObs = roughObservationCountFromTranscript(tr);

  const suggestParentDraft =
    summary.length >= MIN_SUMMARY_FOR_PARENT || (!summary && tr.length >= MIN_TRANSCRIPT_FALLBACK);

  const suggestAction = mhCount >= 1;

  const reportStrongSignal =
    mhCount >= 3 ||
    (mhCount >= 2 && summary.length >= 16) ||
    (mhCount >= 2 && roughObs >= 3);

  const reportMediumSignal = mhCount >= 2 && summary.length >= 24 && roughObs >= 2;

  const suggestReport = reportStrongSignal || reportMediumSignal;

  const flags: VoiceRecapSuggestionFlags = {
    suggestParentDraft,
    suggestAction,
    suggestReport,
  };

  const primary = pickPrimary({
    flags,
    summaryLen: summary.length,
    mhCount,
    roughObs,
  });

  const confidenceHint = confidenceHintFor({
    roughObs,
    mhCount,
    summaryLen: summary.length,
  });

  const previews = buildPreviews({
    summary,
    meaningfulHighlights,
    transcript: tr,
    flags,
  });

  return {
    flags,
    meaningfulHighlights,
    roughObservationCount: roughObs,
    primary,
    confidenceHint,
    previews,
  };
}

/** @deprecated используйте deriveVoiceRecapSuggestions — оставлено для совместимости */
export function deriveVoiceRecapSuggestionFlags(params: {
  summary: string | null;
  highlights: string[];
  transcript: string;
}): VoiceRecapSuggestionFlags {
  return deriveVoiceRecapSuggestions(params).flags;
}

export function hasAnyRecapSuggestion(flags: VoiceRecapSuggestionFlags): boolean {
  return flags.suggestParentDraft || flags.suggestAction || flags.suggestReport;
}
