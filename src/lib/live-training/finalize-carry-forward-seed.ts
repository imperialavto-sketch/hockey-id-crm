/**
 * Компактный seed «что удержать» из planning snapshot последней подтверждённой сессии.
 * Эвристики совпадают с coach-app finalize carry-forward (без утверждений о результате).
 */

import type { LiveTrainingPlanningSnapshotDto } from "./live-training-planning-snapshot";

export type LiveTrainingCarryForwardSeedDto = {
  source: "finalize_carry_forward";
  worthRechecking: string[];
  possibleCarryForward: string[];
  optionalContextOnly: string[];
  sessionId: string;
};

const REPORT_PREFIXES = {
  focusNext: "report_next_",
  focusHint: "report_hint_",
  followup: "report_followup_",
  reinforceHint: "report_hint_r_",
} as const;

function isReportTracedFocusDomain(domain: string): boolean {
  if (domain.startsWith(REPORT_PREFIXES.reinforceHint)) return false;
  if (domain.startsWith(REPORT_PREFIXES.focusNext)) return true;
  return domain.startsWith(REPORT_PREFIXES.focusHint);
}

function isReportTracedReinforce(domain: string): boolean {
  return (
    domain.startsWith(REPORT_PREFIXES.followup) || domain.startsWith(REPORT_PREFIXES.reinforceHint)
  );
}

function isReportTracedSummaryLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("[Отчёты]") || t.startsWith("[Отчёты · проверка]");
}

type LineVm = { primary: string; secondary?: string };

const MAX_SEEDS = 6;
const MAX_FOCUS = 4;
const MAX_REINF = 4;
const MAX_SUMMARY = 4;
const MAX_WORTH = 4;
const MAX_CARRY = 5;
const MAX_CONTEXT_LINES = 4;
const MAX_CONTEXT_SEEDS = 3;

function normPrimary(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function seedLooksLowConfidence(text: string): boolean {
  const t = text.toLowerCase();
  return /проверка|маловер|низк|возможно|условно|мало данных|\?/.test(t);
}

function buildReviewLayerVm(snap: LiveTrainingPlanningSnapshotDto): {
  seedLines: string[];
  focusFromReports: LineVm[];
  reinforceFromReports: LineVm[];
  reportSummaryLines: string[];
} | null {
  const seedLines =
    snap.suggestionSeeds?.source === "report_action_layer" &&
    Array.isArray(snap.suggestionSeeds.items)
      ? snap.suggestionSeeds.items
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, MAX_SEEDS)
      : [];

  const focusFromReports: LineVm[] = [];
  for (const d of snap.focusDomains ?? []) {
    if (!isReportTracedFocusDomain(d.domain)) continue;
    if (focusFromReports.length >= MAX_FOCUS) break;
    const primary = d.labelRu?.trim() || d.domain;
    const reason = d.reason?.trim();
    focusFromReports.push({
      primary,
      secondary:
        reason && reason !== "—" && reason !== primary
          ? reason.length > 160
            ? `${reason.slice(0, 157)}…`
            : reason
          : undefined,
    });
  }

  const reinforceFromReports: LineVm[] = [];
  for (const r of snap.reinforceAreas ?? []) {
    if (!isReportTracedReinforce(r.domain)) continue;
    if (reinforceFromReports.length >= MAX_REINF) break;
    const primary = r.labelRu?.trim() || r.domain;
    const reason = r.reason?.trim();
    reinforceFromReports.push({
      primary,
      secondary:
        reason && reason !== "—" && reason !== primary
          ? reason.length > 160
            ? `${reason.slice(0, 157)}…`
            : reason
          : undefined,
    });
  }

  const reportSummaryLines = (snap.summaryLines ?? [])
    .map((s) => s.trim())
    .filter(isReportTracedSummaryLine)
    .slice(0, MAX_SUMMARY);

  const hasBody =
    seedLines.length > 0 ||
    focusFromReports.length > 0 ||
    reinforceFromReports.length > 0 ||
    reportSummaryLines.length > 0;

  if (!hasBody) return null;

  return { seedLines, focusFromReports, reinforceFromReports, reportSummaryLines };
}

/**
 * null — в снимке нет трассируемых следов отчётов (как на клиенте review/finalize).
 */
export function buildLiveTrainingCarryForwardSeedDto(
  snap: LiveTrainingPlanningSnapshotDto | null,
  sessionId: string
): LiveTrainingCarryForwardSeedDto | null {
  if (!snap || !sessionId.trim()) return null;

  const base = buildReviewLayerVm(snap);
  if (!base) return null;

  const focusNorms = new Map<string, LineVm>();
  for (const f of base.focusFromReports) {
    const k = normPrimary(f.primary);
    if (k) focusNorms.set(k, f);
  }
  const reinforceNorms = new Map<string, LineVm>();
  for (const r of base.reinforceFromReports) {
    const k = normPrimary(r.primary);
    if (k) reinforceNorms.set(k, r);
  }

  const intersectionKeys = [...focusNorms.keys()].filter((k) => reinforceNorms.has(k));

  const worthVm: LineVm[] = [];
  for (const k of intersectionKeys) {
    if (worthVm.length >= MAX_WORTH) break;
    const f = focusNorms.get(k);
    if (!f) continue;
    worthVm.push({ primary: f.primary });
  }

  const worthKeys = new Set(intersectionKeys);
  const carryVm: LineVm[] = [];

  for (const f of base.focusFromReports) {
    if (carryVm.length >= MAX_CARRY) break;
    const k = normPrimary(f.primary);
    if (!k || worthKeys.has(k)) continue;
    carryVm.push({ primary: f.primary });
  }
  for (const r of base.reinforceFromReports) {
    if (carryVm.length >= MAX_CARRY) break;
    const k = normPrimary(r.primary);
    if (!k || worthKeys.has(k)) continue;
    carryVm.push({ primary: r.primary });
  }

  const optionalStrings: string[] = [];
  for (const line of base.reportSummaryLines) {
    if (optionalStrings.length >= MAX_CONTEXT_LINES) break;
    const t = line.trim();
    if (t) optionalStrings.push(t.length > 240 ? `${t.slice(0, 237)}…` : t);
  }

  let lowConfSeedCount = 0;
  for (const seed of base.seedLines) {
    if (seedLooksLowConfidence(seed)) {
      if (lowConfSeedCount >= MAX_CONTEXT_SEEDS) continue;
      lowConfSeedCount += 1;
      optionalStrings.push(seed.length > 220 ? `${seed.slice(0, 217)}…` : seed);
    } else if (carryVm.length < MAX_CARRY) {
      carryVm.push({ primary: seed });
    }
  }

  return {
    source: "finalize_carry_forward",
    sessionId: sessionId.trim(),
    worthRechecking: worthVm.map((w) => w.primary),
    possibleCarryForward: carryVm.map((c) => c.primary),
    optionalContextOnly: optionalStrings,
  };
}
