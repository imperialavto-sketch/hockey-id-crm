/**
 * PHASE 22–23: компактная provenance с момента ingest → колонка draft + API (без сырого payloadJson события).
 * PHASE 32: block-aware context (additive).
 */

import type { LiveTrainingObservationSentiment, Prisma } from "@prisma/client";
import type { ArenaObservationInterpretation } from "@/lib/arena/interpretation/arenaInterpretationTypes";
import {
  arenaObservationInterpretationToJson,
  parseArenaObservationInterpretationFromUnknown,
} from "@/lib/arena/interpretation/arenaInterpretationTypes";

export type LiveTrainingContextAdjustedPlayerMatchSource = "snapshot" | "focus_block" | "start_priority";

export type LiveTrainingContextAdjustedCategorySource =
  | "snapshot"
  | "main_block"
  | "reinforcement_block"
  | "warmup_block"
  | "start_priority";

export type LiveTrainingContextAdjustedSentimentSource = "snapshot" | "reinforcement_block";

export type LiveTrainingIngestProvenanceDto = {
  contextUsed: boolean;
  contextAdjustedPlayerMatch: boolean;
  contextAdjustedCategory: boolean;
  contextAdjustedSentiment: boolean;
  parserConfidenceBeforeContext: number | null;
  parserConfidenceAfterContext: number | null;
  contextSignals: string[];
  /** PHASE 23: цели для быстрых правок (tie-break / nudge), если флаги выше true. */
  contextSuggestionPlayerId?: string | null;
  contextSuggestionPlayerName?: string | null;
  contextSuggestionCategory?: string | null;
  contextSuggestionSentiment?: LiveTrainingObservationSentiment | null;
  /** PHASE 32 */
  blockContextUsed?: boolean;
  blockContextSignals?: string[];
  contextAdjustedPlayerMatchSource?: LiveTrainingContextAdjustedPlayerMatchSource | null;
  contextAdjustedCategorySource?: LiveTrainingContextAdjustedCategorySource | null;
  contextAdjustedSentimentSource?: LiveTrainingContextAdjustedSentimentSource | null;
  /** PHASE 43 */
  startPriorityUsed?: boolean;
  startPrioritySignals?: string[];
  startPriorityPlayerHit?: boolean;
  startPriorityDomainHit?: boolean;
  startPriorityReinforcementHit?: boolean;
  /** Arena interpretation (rule-based, ingest-time); optional для старых черновиков. */
  arenaInterpretation?: ArenaObservationInterpretation | null;
};

const SENTIMENTS: LiveTrainingObservationSentiment[] = ["positive", "negative", "neutral"];

const PLAYER_MATCH_SOURCES: LiveTrainingContextAdjustedPlayerMatchSource[] = [
  "snapshot",
  "focus_block",
  "start_priority",
];

const CATEGORY_SOURCES: LiveTrainingContextAdjustedCategorySource[] = [
  "snapshot",
  "main_block",
  "reinforcement_block",
  "warmup_block",
  "start_priority",
];

const SENTIMENT_SOURCES: LiveTrainingContextAdjustedSentimentSource[] = [
  "snapshot",
  "reinforcement_block",
];

function parseSentiment(v: unknown): LiveTrainingObservationSentiment | null {
  if (typeof v !== "string") return null;
  const s = v.trim() as LiveTrainingObservationSentiment;
  return SENTIMENTS.includes(s) ? s : null;
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export function buildIngestProvenanceJsonValue(
  ctx: LiveTrainingIngestProvenanceDto
): Prisma.InputJsonValue {
  const base = {
    contextUsed: Boolean(ctx.contextUsed),
    contextAdjustedPlayerMatch: Boolean(ctx.contextAdjustedPlayerMatch),
    contextAdjustedCategory: Boolean(ctx.contextAdjustedCategory),
    contextAdjustedSentiment: Boolean(ctx.contextAdjustedSentiment),
    parserConfidenceBeforeContext:
      typeof ctx.parserConfidenceBeforeContext === "number" &&
      Number.isFinite(ctx.parserConfidenceBeforeContext)
        ? ctx.parserConfidenceBeforeContext
        : null,
    parserConfidenceAfterContext:
      typeof ctx.parserConfidenceAfterContext === "number" &&
      Number.isFinite(ctx.parserConfidenceAfterContext)
        ? ctx.parserConfidenceAfterContext
        : null,
    contextSignals: Array.isArray(ctx.contextSignals)
      ? ctx.contextSignals.filter((s): s is string => typeof s === "string")
      : [],
  } as Prisma.InputJsonValue;
  const o = base as Record<string, unknown>;
  const pid = strOrNull(ctx.contextSuggestionPlayerId);
  if (pid) o.contextSuggestionPlayerId = pid;
  const pname = strOrNull(ctx.contextSuggestionPlayerName);
  if (pname) o.contextSuggestionPlayerName = pname;
  const ccat = strOrNull(ctx.contextSuggestionCategory);
  if (ccat) o.contextSuggestionCategory = ccat;
  if (ctx.contextSuggestionSentiment && SENTIMENTS.includes(ctx.contextSuggestionSentiment)) {
    o.contextSuggestionSentiment = ctx.contextSuggestionSentiment;
  }
  if (ctx.blockContextUsed === true) {
    o.blockContextUsed = true;
  }
  if (Array.isArray(ctx.blockContextSignals) && ctx.blockContextSignals.length > 0) {
    o.blockContextSignals = ctx.blockContextSignals.filter((s): s is string => typeof s === "string");
  }
  const pms = ctx.contextAdjustedPlayerMatchSource;
  if (pms && PLAYER_MATCH_SOURCES.includes(pms)) {
    o.contextAdjustedPlayerMatchSource = pms;
  }
  const ccs = ctx.contextAdjustedCategorySource;
  if (ccs && CATEGORY_SOURCES.includes(ccs)) {
    o.contextAdjustedCategorySource = ccs;
  }
  const css = ctx.contextAdjustedSentimentSource;
  if (css && SENTIMENT_SOURCES.includes(css)) {
    o.contextAdjustedSentimentSource = css;
  }
  if (ctx.startPriorityUsed === true) {
    o.startPriorityUsed = true;
  }
  if (Array.isArray(ctx.startPrioritySignals) && ctx.startPrioritySignals.length > 0) {
    o.startPrioritySignals = ctx.startPrioritySignals.filter((s): s is string => typeof s === "string");
  }
  if (ctx.startPriorityPlayerHit === true) {
    o.startPriorityPlayerHit = true;
  }
  if (ctx.startPriorityDomainHit === true) {
    o.startPriorityDomainHit = true;
  }
  if (ctx.startPriorityReinforcementHit === true) {
    o.startPriorityReinforcementHit = true;
  }
  if (ctx.arenaInterpretation) {
    o.arenaInterpretation = arenaObservationInterpretationToJson(ctx.arenaInterpretation);
  }
  return base;
}

export function parseIngestProvenanceFromDb(raw: unknown): LiveTrainingIngestProvenanceDto | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const signals = o.contextSignals;
  const contextSignals = Array.isArray(signals)
    ? signals.filter((s): s is string => typeof s === "string")
    : [];

  const numOrNull = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  const dto: LiveTrainingIngestProvenanceDto = {
    contextUsed: Boolean(o.contextUsed),
    contextAdjustedPlayerMatch: Boolean(o.contextAdjustedPlayerMatch),
    contextAdjustedCategory: Boolean(o.contextAdjustedCategory),
    contextAdjustedSentiment: Boolean(o.contextAdjustedSentiment),
    parserConfidenceBeforeContext: numOrNull(o.parserConfidenceBeforeContext),
    parserConfidenceAfterContext: numOrNull(o.parserConfidenceAfterContext),
    contextSignals,
  };
  const spid = strOrNull(o.contextSuggestionPlayerId);
  if (spid) dto.contextSuggestionPlayerId = spid;
  const spn = strOrNull(o.contextSuggestionPlayerName);
  if (spn) dto.contextSuggestionPlayerName = spn;
  const scat = strOrNull(o.contextSuggestionCategory);
  if (scat) dto.contextSuggestionCategory = scat;
  const ss = parseSentiment(o.contextSuggestionSentiment);
  if (ss) dto.contextSuggestionSentiment = ss;
  if (o.blockContextUsed === true) dto.blockContextUsed = true;
  const bsig = o.blockContextSignals;
  if (Array.isArray(bsig)) {
    dto.blockContextSignals = bsig.filter((s): s is string => typeof s === "string");
  }
  const pms = o.contextAdjustedPlayerMatchSource;
  if (typeof pms === "string" && PLAYER_MATCH_SOURCES.includes(pms as LiveTrainingContextAdjustedPlayerMatchSource)) {
    dto.contextAdjustedPlayerMatchSource = pms as LiveTrainingContextAdjustedPlayerMatchSource;
  }
  const ccs = o.contextAdjustedCategorySource;
  if (typeof ccs === "string" && CATEGORY_SOURCES.includes(ccs as LiveTrainingContextAdjustedCategorySource)) {
    dto.contextAdjustedCategorySource = ccs as LiveTrainingContextAdjustedCategorySource;
  }
  const css = o.contextAdjustedSentimentSource;
  if (typeof css === "string" && SENTIMENT_SOURCES.includes(css as LiveTrainingContextAdjustedSentimentSource)) {
    dto.contextAdjustedSentimentSource = css as LiveTrainingContextAdjustedSentimentSource;
  }
  if (o.startPriorityUsed === true) dto.startPriorityUsed = true;
  const sps = o.startPrioritySignals;
  if (Array.isArray(sps)) {
    dto.startPrioritySignals = sps.filter((x): x is string => typeof x === "string");
  }
  if (o.startPriorityPlayerHit === true) dto.startPriorityPlayerHit = true;
  if (o.startPriorityDomainHit === true) dto.startPriorityDomainHit = true;
  if (o.startPriorityReinforcementHit === true) dto.startPriorityReinforcementHit = true;
  const ai = parseArenaObservationInterpretationFromUnknown(o.arenaInterpretation);
  if (ai) dto.arenaInterpretation = ai;
  return dto;
}
