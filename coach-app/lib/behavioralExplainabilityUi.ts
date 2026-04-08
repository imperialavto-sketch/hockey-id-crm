import type { BehavioralAxisExplainability } from "@/services/coachScheduleService";

function pluralObservations(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} наблюдений`;
  if (mod10 === 1) return `${n} наблюдение`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} наблюдения`;
  return `${n} наблюдений`;
}

/** Короткая подпись для одной оси (эфир). */
export function formatBehavioralAxisExplainShort(
  e: BehavioralAxisExplainability
): string {
  if (e.totalSignals <= 0) return "";
  if (e.positiveCount > 0 || e.negativeCount > 0) {
    return `${e.positiveCount}+ / ${e.negativeCount}−`;
  }
  return pluralObservations(e.totalSignals);
}

export type BehavioralExplainabilityAxes = {
  focus?: BehavioralAxisExplainability;
  discipline?: BehavioralAxisExplainability;
};

/**
 * Одна строка контекста эфира для quick evaluation (без префикса-источника).
 * null если нет explainability или ни одного сигнала по осям.
 */
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

const TEAM_AGG_PLACEHOLDER_LAST_AT = "1970-01-01T00:00:00.000Z";

/**
 * Суммирует explainability по всем игрокам из ответа behavioral-suggestions (команда на слот).
 */
export function aggregateTeamBehaviorExplainabilityFromPlayers(
  players: ReadonlyArray<{ explainability?: BehavioralExplainabilityAxes }>
): BehavioralExplainabilityAxes {
  let fP = 0;
  let fN = 0;
  let fU = 0;
  let dP = 0;
  let dN = 0;
  let dU = 0;
  for (const p of players) {
    const f = p.explainability?.focus;
    if (f) {
      fP += f.positiveCount;
      fN += f.negativeCount;
      fU += f.neutralCount;
    }
    const d = p.explainability?.discipline;
    if (d) {
      dP += d.positiveCount;
      dN += d.negativeCount;
      dU += d.neutralCount;
    }
  }
  const out: BehavioralExplainabilityAxes = {};
  const ft = fP + fN + fU;
  if (ft > 0) {
    out.focus = {
      positiveCount: fP,
      negativeCount: fN,
      neutralCount: fU,
      totalSignals: ft,
      lastSignalAt: TEAM_AGG_PLACEHOLDER_LAST_AT,
    };
  }
  const dt = dP + dN + dU;
  if (dt > 0) {
    out.discipline = {
      positiveCount: dP,
      negativeCount: dN,
      neutralCount: dU,
      totalSignals: dt,
      lastSignalAt: TEAM_AGG_PLACEHOLDER_LAST_AT,
    };
  }
  return out;
}

export function buildReportTeamBehaviorContextLine(
  players: ReadonlyArray<{ explainability?: BehavioralExplainabilityAxes }>,
  prefix: string
): string | null {
  const axes = aggregateTeamBehaviorExplainabilityFromPlayers(players);
  const body = buildLiveExplainabilityEvalContextBody(axes);
  return body ? `${prefix} ${body}` : null;
}
