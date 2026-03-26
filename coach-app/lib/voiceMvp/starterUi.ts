import type { VoiceStarterPayload } from "./starter";

export type VoiceStarterDestinationContext = {
  summary: string;
  highlights: string[];
  playerLabel: string | null;
  sessionLabel: string | null;
  sourceHint: string;
};

function cleanLine(input: string): string {
  return input.replace(/\s+/g, " ").replace(/^[-•*]\s*/, "").trim();
}

function fallbackSummaryFromTranscript(transcript: string): string | null {
  const first = transcript
    .split(/\n+/)
    .map(cleanLine)
    .find((line) => line.length >= 16);
  if (!first) return null;
  return first.length > 180 ? `${first.slice(0, 179).trimEnd()}…` : first;
}

function deriveSourceHint(payload: VoiceStarterPayload, highlightsCount: number): string {
  const summary = payload.summary?.trim() ?? "";
  const sessionHint = payload.context?.sessionHint?.trim() ?? "";
  const isSeries =
    /серия|серии/i.test(summary) ||
    /серия|серии/i.test(sessionHint) ||
    highlightsCount >= 3;
  if (isSeries) return "По итогам серии";
  if (summary || highlightsCount > 0) return "На основе заметки";
  return "На основе голосовой заметки";
}

export function buildVoiceStarterDestinationContext(
  payload: VoiceStarterPayload
): VoiceStarterDestinationContext {
  const ai = payload.aiProcessed;
  const aiBullets =
    ai &&
    (ai.strengths.length > 0 ||
      ai.improvements.length > 0 ||
      ai.recommendations.length > 0);

  const highlightsFromAi = aiBullets && ai
    ? [...ai.strengths, ...ai.improvements, ...ai.recommendations]
    : [];

  const highlightsSource = aiBullets ? highlightsFromAi : (payload.highlights ?? []);

  const highlights = highlightsSource
    .map(cleanLine)
    .filter((line) => line.length >= 10)
    .filter((line, i, arr) => arr.findIndex((it) => it.toLowerCase() === line.toLowerCase()) === i)
    .slice(0, 4);

  const summary =
    ai?.summary?.trim() ||
    payload.summary?.trim() ||
    fallbackSummaryFromTranscript(payload.transcript) ||
    "Краткая выжимка пока недоступна.";

  return {
    summary,
    highlights,
    playerLabel: payload.context?.playerLabel?.trim() || null,
    sessionLabel: payload.context?.sessionHint?.trim() || null,
    sourceHint: deriveSourceHint(payload, highlights.length),
  };
}
