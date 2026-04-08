/**
 * Текст explainability для live behavioral (GET .../behavioral-suggestions).
 * Чистые функции — CRM и при необходимости другие клиенты.
 */

export type BehavioralAxisExplainability = {
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  totalSignals: number;
  lastSignalAt: string;
};

export type BehavioralExplainabilityAxes = {
  focus?: BehavioralAxisExplainability;
  discipline?: BehavioralAxisExplainability;
};

function pluralObservations(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} наблюдений`;
  if (mod10 === 1) return `${n} наблюдение`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} наблюдения`;
  return `${n} наблюдений`;
}

export function formatBehavioralAxisExplainShort(
  e: BehavioralAxisExplainability
): string {
  if (e.totalSignals <= 0) return "";
  if (e.positiveCount > 0 || e.negativeCount > 0) {
    return `${e.positiveCount}+ / ${e.negativeCount}−`;
  }
  return pluralObservations(e.totalSignals);
}

/** Тело строки без префикса «По наблюдениям…». */
export function buildLiveExplainabilityEvalContextBody(
  explainability: BehavioralExplainabilityAxes | undefined
): string | null {
  if (!explainability) return null;
  const parts: string[] = [];
  if (explainability.focus && explainability.focus.totalSignals > 0) {
    const s = formatBehavioralAxisExplainShort(explainability.focus);
    if (s) parts.push(`Конц. ${s}`);
  }
  if (explainability.discipline && explainability.discipline.totalSignals > 0) {
    const s = formatBehavioralAxisExplainShort(explainability.discipline);
    if (s) parts.push(`Дисц. ${s}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
