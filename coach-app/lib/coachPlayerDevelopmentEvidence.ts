/**
 * Maps confirmed Live Training rollup slices → `DevelopmentDomain` rows from the
 * shared reference framework (`src/lib/player-development/ageDevelopmentFramework.ts`).
 *
 * Rule-based only: statuses and copy for the coach Player Passport UI; no below/expected/above scoring.
 */

import type { DevelopmentDomain } from "../../src/lib/player-development/ageDevelopmentFramework";
import type { PlayerLiveTrainingSignalsBundle } from "@/services/coachPlayersService";
import { DEVELOPMENT_DOMAINS_ORDER, DOMAIN_TITLE_RU } from "./coachAgeStandardsPresentation";

export type CoachDomainEvidenceStatus = "no_signal" | "observed" | "focus_active";

export type DomainInterpretation =
  | "strength"
  | "normal"
  | "attention"
  | "insufficient_data";

/**
 * Лёгкая свежесть последней отметки по домену (только `lastSignalAt`, без трендов).
 *
 * Окна — фиксированные сутки по разнице локального времени устройства и ISO-времени сигнала
 * (достаточно для «свежо / недавно / давно»; не календарные сезоны).
 */
export type DomainRecencyStatus =
  | "fresh_focus"
  | "recent_signal"
  | "stale_signal"
  | "no_recent_signal";

/** «Очень недавно» для связки с focus_active → fresh_focus */
const RECENCY_FRESH_FOCUS_MAX_DAYS = 5;

/** Верхняя граница «ещё недавно» vs устаревшие отметки */
const RECENCY_RECENT_SIGNAL_MAX_DAYS = 21;

export type CoachDomainEvidenceVm = {
  status: CoachDomainEvidenceStatus;
  recentEvidenceCount: number;
  lastSignalAt: string | null;
  interpretation: DomainInterpretation;
  recencyStatus: DomainRecencyStatus;
};

type EvidenceSlice = {
  metricDomain: string;
  metricKey: string;
  signalCount: number;
  positiveCount?: number;
  negativeCount: number;
  lastSignalAt: string;
};

type Matcher =
  | { kind: "domain"; domain: string }
  | { kind: "domain_key"; domain: string; key: string };

const DEV_DOMAIN_MATCHERS: Record<DevelopmentDomain, Matcher[]> = {
  skating: [{ kind: "domain", domain: "skating" }],
  puck_control: [{ kind: "domain", domain: "puck_control" }],
  /** Live training uses `pace` for темп / чтение игры — ближайший доступный сигнал. */
  decision_making: [{ kind: "domain", domain: "pace" }],
  discipline: [{ kind: "domain_key", domain: "behavior", key: "discipline" }],
  attention: [{ kind: "domain_key", domain: "behavior", key: "attention" }],
  physical: [
    { kind: "domain", domain: "ofp" },
    { kind: "domain", domain: "workrate" },
  ],
};

function sliceMatches(matcher: Matcher, s: EvidenceSlice): boolean {
  if (matcher.kind === "domain") return s.metricDomain === matcher.domain;
  return s.metricDomain === matcher.domain && s.metricKey === matcher.key;
}

function aggregateForDomain(
  slices: EvidenceSlice[],
  domain: DevelopmentDomain
): {
  recentEvidenceCount: number;
  positiveCount: number;
  negativeCount: number;
  lastSignalAt: string | null;
} {
  const matchers = DEV_DOMAIN_MATCHERS[domain];
  let recentEvidenceCount = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let lastSignalAt: string | null = null;

  for (const s of slices) {
    if (!matchers.some((m) => sliceMatches(m, s))) continue;
    recentEvidenceCount += s.signalCount;
    positiveCount += s.positiveCount ?? 0;
    negativeCount += s.negativeCount;
    if (!lastSignalAt || s.lastSignalAt > lastSignalAt) lastSignalAt = s.lastSignalAt;
  }

  return { recentEvidenceCount, positiveCount, negativeCount, lastSignalAt };
}

/** Плюс/минус по слайсам есть только если сервер отдаёт positiveCount в каждом слайсе (или слайсов нет). */
function polarityAvailableFromSlices(slices: EvidenceSlice[]): boolean {
  if (slices.length === 0) return true;
  return slices.every((s) => typeof s.positiveCount === "number");
}

/**
 * Детерминированная интерпретация домена (без ML).
 * При отсутствии полярности в данных — только по status.
 */
function toInterpretation(
  polarityAvailable: boolean,
  status: CoachDomainEvidenceStatus,
  recentEvidenceCount: number,
  negativeCount: number,
  positiveCount: number
): DomainInterpretation {
  if (!polarityAvailable) {
    if (status === "no_signal") return "insufficient_data";
    if (status === "focus_active") return "attention";
    return "normal";
  }

  if (recentEvidenceCount <= 0 || status === "no_signal") return "insufficient_data";
  if (status === "focus_active" || negativeCount >= 2) return "attention";
  if (positiveCount >= 2 && negativeCount === 0) return "strength";
  return "normal";
}

/**
 * Conservative status rules (recent window only):
 * - no_signal: нет сигналов, попавших в домен
 * - focus_active: ≥2 негативных отметки по домену ИЛИ ≥4 любых при ≥1 негативе (повторяющееся внимание)
 * - observed: иначе при ≥1 сигнале
 */
function toStatus(
  recentEvidenceCount: number,
  negativeCount: number
): CoachDomainEvidenceStatus {
  if (recentEvidenceCount <= 0) return "no_signal";
  if (negativeCount >= 2) return "focus_active";
  if (recentEvidenceCount >= 4 && negativeCount >= 1) return "focus_active";
  return "observed";
}

/** Полные сутки с момента lastSignalAt до `nowMs` (не календарные даты). */
function ageWholeDaysSinceSignal(iso: string, nowMs: number): number | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const delta = Math.max(0, nowMs - t);
  return Math.floor(delta / (24 * 60 * 60 * 1000));
}

function toRecencyStatus(
  status: CoachDomainEvidenceStatus,
  recentEvidenceCount: number,
  lastSignalAt: string | null,
  nowMs: number = Date.now()
): DomainRecencyStatus {
  if (recentEvidenceCount <= 0 || !lastSignalAt) return "no_recent_signal";
  const days = ageWholeDaysSinceSignal(lastSignalAt, nowMs);
  if (days === null) return "no_recent_signal";
  if (status === "focus_active" && days <= RECENCY_FRESH_FOCUS_MAX_DAYS) return "fresh_focus";
  if (days <= RECENCY_RECENT_SIGNAL_MAX_DAYS) return "recent_signal";
  return "stale_signal";
}

export type CoachDevelopmentEvidencePhase = "loading" | "error" | "ready";

export type CoachDevelopmentEvidenceRow = {
  phase: CoachDevelopmentEvidencePhase;
  vm: CoachDomainEvidenceVm;
};

function defaultNoSignal(): CoachDomainEvidenceVm {
  return {
    status: "no_signal",
    recentEvidenceCount: 0,
    lastSignalAt: null,
    interpretation: "insufficient_data",
    recencyStatus: "no_recent_signal",
  };
}

/**
 * Builds per-domain evidence aligned with age standards rows.
 * On load error, returns `error` phase with neutral no_signal copy in vm (UI shows «недоступно»).
 */
export function buildCoachPlayerDevelopmentEvidenceByDomain(
  bundle: PlayerLiveTrainingSignalsBundle | null,
  phase: CoachDevelopmentEvidencePhase
): Record<DevelopmentDomain, CoachDevelopmentEvidenceRow> {
  const domains = Object.keys(DEV_DOMAIN_MATCHERS) as DevelopmentDomain[];
  const out = {} as Record<DevelopmentDomain, CoachDevelopmentEvidenceRow>;

  if (phase === "loading") {
    for (const d of domains) {
      out[d] = { phase: "loading", vm: defaultNoSignal() };
    }
    return out;
  }

  if (phase === "error" || !bundle) {
    for (const d of domains) {
      out[d] = { phase: "error", vm: defaultNoSignal() };
    }
    return out;
  }

  const slices: EvidenceSlice[] = Array.isArray(bundle.recentEvidenceSlices)
    ? bundle.recentEvidenceSlices
    : [];

  const polarityAvailable = polarityAvailableFromSlices(slices);

  for (const d of domains) {
    const { recentEvidenceCount, positiveCount, negativeCount, lastSignalAt } =
      aggregateForDomain(slices, d);
    const status = toStatus(recentEvidenceCount, negativeCount);
    const interpretation = toInterpretation(
      polarityAvailable,
      status,
      recentEvidenceCount,
      negativeCount,
      positiveCount
    );
    const recencyStatus = toRecencyStatus(status, recentEvidenceCount, lastSignalAt);
    out[d] = {
      phase: "ready",
      vm: {
        status,
        recentEvidenceCount,
        lastSignalAt,
        interpretation,
        recencyStatus,
      },
    };
  }

  return out;
}

/** Сколько доменов показывать в каждой группе сводки. */
const PLAYER_SUMMARY_DOMAIN_CAP = 2;

/** Сводка по игроку из уже посчитанных per-domain VM (без общего балла). */
export type CoachPlayerDevelopmentSummaryVm = {
  focusDomains: DevelopmentDomain[];
  strengthDomains: DevelopmentDomain[];
  lowDataDomains: DevelopmentDomain[];
  /** До 2 строк: приоритет фокус → сильные стороны → мало данных. */
  summaryLines: string[];
};

function joinDomainTitlesRu(domains: DevelopmentDomain[]): string {
  return domains.map((d) => DOMAIN_TITLE_RU[d]).join(", ");
}

/**
 * Собирает компактную сводку только при `evidencePhase === "ready"`.
 * Иначе `null` (блок в UI не показываем).
 */
export function buildCoachPlayerDevelopmentSummaryVm(
  evidenceByDomain: Record<DevelopmentDomain, CoachDevelopmentEvidenceRow>,
  evidencePhase: CoachDevelopmentEvidencePhase
): CoachPlayerDevelopmentSummaryVm | null {
  if (evidencePhase !== "ready") return null;

  const focusCandidates: DevelopmentDomain[] = [];
  const strengthCandidates: DevelopmentDomain[] = [];
  const lowDataCandidates: DevelopmentDomain[] = [];

  for (const d of DEVELOPMENT_DOMAINS_ORDER) {
    const row = evidenceByDomain[d];
    if (!row || row.phase !== "ready") return null;
    const vm = row.vm;

    if (vm.interpretation === "attention" || vm.recencyStatus === "fresh_focus") {
      focusCandidates.push(d);
    }
    if (vm.interpretation === "strength") {
      strengthCandidates.push(d);
    }
    if (vm.interpretation === "insufficient_data") {
      lowDataCandidates.push(d);
    }
  }

  const focusDomains = focusCandidates.slice(0, PLAYER_SUMMARY_DOMAIN_CAP);
  const strengthDomains = strengthCandidates.slice(0, PLAYER_SUMMARY_DOMAIN_CAP);
  const lowDataDomains = lowDataCandidates.slice(0, PLAYER_SUMMARY_DOMAIN_CAP);

  if (
    focusDomains.length === 0 &&
    strengthDomains.length === 0 &&
    lowDataDomains.length === 0
  ) {
    return null;
  }

  const summaryLines: string[] = [];
  if (focusDomains.length > 0) {
    summaryLines.push(`Сейчас в фокусе: ${joinDomainTitlesRu(focusDomains)}`);
  }
  if (summaryLines.length < 2 && strengthDomains.length > 0) {
    summaryLines.push(
      strengthDomains.length === 1
        ? `Сильная сторона: ${DOMAIN_TITLE_RU[strengthDomains[0]!]}`
        : `Сильные стороны: ${joinDomainTitlesRu(strengthDomains)}`
    );
  }
  if (summaryLines.length < 2 && lowDataDomains.length > 0) {
    summaryLines.push(`Мало данных: ${joinDomainTitlesRu(lowDataDomains)}`);
  }

  return {
    focusDomains,
    strengthDomains,
    lowDataDomains,
    summaryLines,
  };
}

/** Сколько строк подсказок показывать в UI (приоритет: внимание → поддержка → данные). */
const ACTION_HINTS_VISIBLE_MAX = 3;

/**
 * Короткие подсказки тренеру из rollup (без LLM, только домены из сводки).
 * `summaryHints` — не более 3 строк в порядке приоритета.
 */
export type CoachPlayerDevelopmentActionHintsVm = {
  attentionHints: string[];
  supportHints: string[];
  dataHints: string[];
  summaryHints: string[];
};

export function buildCoachPlayerDevelopmentActionHintsVm(
  summary: CoachPlayerDevelopmentSummaryVm | null
): CoachPlayerDevelopmentActionHintsVm | null {
  if (!summary) return null;

  const attentionHints: string[] = [];
  if (summary.focusDomains.length > 0) {
    attentionHints.push(
      `Усилить внимание: ${joinDomainTitlesRu(summary.focusDomains)}`
    );
  }

  const supportHints: string[] = [];
  if (summary.strengthDomains.length > 0) {
    supportHints.push(
      summary.strengthDomains.length === 1
        ? `Поддерживать сильную сторону: ${DOMAIN_TITLE_RU[summary.strengthDomains[0]!]}`
        : `Поддерживать сильные стороны: ${joinDomainTitlesRu(summary.strengthDomains)}`
    );
  }

  const dataHints: string[] = [];
  if (summary.lowDataDomains.length > 0) {
    dataHints.push(`Добрать сигналы: ${joinDomainTitlesRu(summary.lowDataDomains)}`);
  }

  const summaryHints = [...attentionHints, ...supportHints, ...dataHints].slice(
    0,
    ACTION_HINTS_VISIBLE_MAX
  );

  if (summaryHints.length === 0) return null;

  return {
    attentionHints,
    supportHints,
    dataHints,
    summaryHints,
  };
}

export function domainRecencyLabelRu(s: DomainRecencyStatus): string {
  switch (s) {
    case "fresh_focus":
      return "Свежий фокус";
    case "recent_signal":
      return "Недавняя активность";
    case "stale_signal":
      return "Отметки не новые";
    case "no_recent_signal":
      return "Нет свежих отметок";
  }
}

/** Строка для UI с учётом фазы загрузки (без ложных выводов о дате). */
export function coachDomainRecencyLineRu(row: CoachDevelopmentEvidenceRow): string {
  if (row.phase === "loading") return "…";
  if (row.phase === "error") return "—";
  return domainRecencyLabelRu(row.vm.recencyStatus);
}

export function domainInterpretationLabelRu(i: DomainInterpretation): string {
  switch (i) {
    case "strength":
      return "Сильная сторона";
    case "normal":
      return "В норме";
    case "attention":
      return "Зона внимания";
    case "insufficient_data":
      return "Недостаточно данных";
  }
}

export function formatCoachEvidenceDateShortRu(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return null;
  }
}

export function coachDomainEvidenceLabelRu(
  row: CoachDevelopmentEvidenceRow,
  windowMax: number | undefined
): string {
  if (row.phase === "loading") return "…";
  if (row.phase === "error") return "Отметки недоступны";
  const { status, lastSignalAt } = row.vm;
  const date = formatCoachEvidenceDateShortRu(lastSignalAt);
  if (status === "no_signal") {
    return windowMax
      ? `Нет отметок в последних ${windowMax} сигналах`
      : "Нет недавних отметок";
  }
  if (status === "focus_active") {
    return date
      ? `Повторяющиеся отметки · ${date}`
      : "Повторяющиеся отметки тренера";
  }
  return date ? `Есть отметки · ${date}` : "Есть недавние отметки";
}
