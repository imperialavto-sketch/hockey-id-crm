/**
 * Опциональное усиление planning snapshot ориентирами из прошлого цикла (finalize carry-forward seed).
 * Вызывать после mergeReportTaskSuggestionsIntoPlanningSnapshot — отчёты остаются первичными, дедуп по тексту.
 */

import type { LiveTrainingCarryForwardSeedDto } from "@/services/liveTrainingService";
import type { LiveTrainingPlanningSnapshot } from "@/types/liveTraining";

function normSeed(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .slice(0, 160);
}

function stripLeadingBracketTag(s: string): string {
  const t = s.trim();
  if (!t.startsWith("[")) return t;
  const close = t.indexOf("]");
  if (close <= 0) return t;
  return t.slice(close + 1).trim();
}

function collectUsedNorms(snapshot: LiveTrainingPlanningSnapshot): Set<string> {
  const seen = new Set<string>();
  for (const d of snapshot.focusDomains) {
    const n = normSeed(d.labelRu);
    if (n) seen.add(n);
  }
  for (const r of snapshot.reinforceAreas) {
    const n = normSeed(r.labelRu);
    if (n) seen.add(n);
  }
  for (const line of snapshot.summaryLines) {
    const n = normSeed(stripLeadingBracketTag(line));
    if (n) seen.add(n);
  }
  for (const it of snapshot.suggestionSeeds?.items ?? []) {
    const n = normSeed(it);
    if (n) seen.add(n);
  }
  return seen;
}

function domainKeyFromTitle(title: string, prefix: string): string {
  let h = 0;
  const t = title.slice(0, 80);
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return `${prefix}_${Math.abs(h).toString(36).slice(0, 8)}`;
}

const MAX_WORTH_REINF = 2;
const MAX_CARRY_FOCUS = 3;
const MAX_CONTEXT_SUMMARY = 2;

export function mergeFinalizeCarryForwardSeedIntoPlanningSnapshot(
  snapshot: LiveTrainingPlanningSnapshot,
  seed: LiveTrainingCarryForwardSeedDto | null | undefined,
  opts: { enabled: boolean }
): LiveTrainingPlanningSnapshot {
  if (!opts.enabled || !seed || seed.source !== "finalize_carry_forward") {
    return snapshot;
  }

  const used = collectUsedNorms(snapshot);
  const focusDomains = [...snapshot.focusDomains];
  const reinforceAreas = [...snapshot.reinforceAreas];
  const summaryLines = [...snapshot.summaryLines];

  let nw = 0;
  for (const line of seed.worthRechecking) {
    if (nw >= MAX_WORTH_REINF) break;
    const n = normSeed(line);
    if (!n || used.has(n)) continue;
    used.add(n);
    nw += 1;
    reinforceAreas.push({
      domain: domainKeyFromTitle(line, "prev_cycle_recheck"),
      labelRu: line.trim().slice(0, 120),
      reason: "С прошлого старта (слой отчётов) — сверьте при планировании, без оценки результата.",
    });
  }

  let nc = 0;
  for (const line of seed.possibleCarryForward) {
    if (nc >= MAX_CARRY_FOCUS) break;
    const n = normSeed(line);
    if (!n || used.has(n)) continue;
    used.add(n);
    nc += 1;
    focusDomains.push({
      domain: domainKeyFromTitle(line, "prev_cycle_carry"),
      labelRu: line.trim().slice(0, 120),
      reason: "Из прошлого цикла: можно удержать, если тема снова актуальна.",
      priority: "medium",
    });
  }

  let ns = 0;
  for (const line of seed.optionalContextOnly) {
    if (ns >= MAX_CONTEXT_SUMMARY) break;
    const stripped = stripLeadingBracketTag(line);
    const n = normSeed(stripped);
    if (!n || used.has(n)) continue;
    used.add(n);
    ns += 1;
    summaryLines.push(`[Прошлый цикл] ${stripped.slice(0, 400)}`);
  }

  return {
    ...snapshot,
    focusDomains,
    reinforceAreas,
    summaryLines,
  };
}
