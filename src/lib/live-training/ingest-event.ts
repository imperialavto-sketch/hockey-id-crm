/**
 * Ingest события живой тренировки: нормализация → матчинг → event + draft в одной транзакции.
 * PHASE 21: опциональный observationContext из planning snapshot — tie-break матчинга и nudge категории/тональности.
 *
 * Offline / delayed flush: этот слой не использует server wall-clock для порядка событий и не отвергает
 * запись только из‑за задержки доставки. Идемпотентность и повторные POST — на стороне клиента
 * (`clientMutationId` в coach outbox). Отказ по времени возможен только из‑за бизнес-правил выше
 * (например сессия уже не `live` — см. `ingestLiveTrainingEventForCoach`).
 */

import type {
  LiveTrainingEventSourceType,
  LiveTrainingObservationSentiment,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { normalizeLiveTrainingEventText } from "./normalize-text";
import {
  matchPlayerForLiveTrainingEvent,
  type LiveTrainingPlayerMatchResult,
} from "./match-player";
import { parseLiveTrainingObservationText } from "./parse-live-training-text";
import { buildDraftFromLiveTrainingEvent } from "./draft-from-event";
import { buildIngestProvenanceJsonValue } from "./live-training-ingest-provenance";
import { LiveTrainingHttpError } from "./http-error";
import {
  applyObservationContextNudges,
  computeStartPriorityExecutionBoost,
  type LiveTrainingObservationContext,
} from "./live-training-observation-context";
import { buildArenaRuntimeContext } from "@/lib/arena/runtime/arenaRuntimeContext";
import { resolvePlayerFromSpeech } from "@/lib/arena/runtime/arenaPlayerResolver";
import { evaluateArenaSpeechPolicy } from "@/lib/arena/runtime/arenaSpeechPolicy";
import { arenaRuntimeOutcomeToHttpBody } from "@/lib/arena/runtime/arenaRuntimeOutcome";
import { interpretArenaObservation } from "@/lib/arena/interpretation/interpretArenaObservation";
import { arenaObservationInterpretationToJson } from "@/lib/arena/interpretation/arenaInterpretationTypes";
import { updateSessionMeaning } from "./session-meaning";

function observationBlockContextUsed(ctx: LiveTrainingObservationContext | null): boolean {
  if (!ctx) return false;
  return (
    ctx.focusBlockPlayerIds.length > 0 ||
    ctx.mainBlockDomains.length > 0 ||
    ctx.reinforcementBlockDomains.length > 0 ||
    ctx.warmupBlockDomains.length > 0
  );
}

function observationBlockContextSignals(ctx: LiveTrainingObservationContext | null): string[] {
  if (!ctx) return [];
  const out: string[] = [];
  if (ctx.focusBlockPlayerIds.length > 0) {
    out.push(`block:focus_players:${ctx.focusBlockPlayerIds.length}`);
  }
  if (ctx.mainBlockDomains.length > 0) {
    out.push(`block:main_domains:${ctx.mainBlockDomains.length}`);
  }
  if (ctx.reinforcementBlockDomains.length > 0) {
    out.push(`block:reinforcement_domains:${ctx.reinforcementBlockDomains.length}`);
  }
  if (ctx.warmupBlockDomains.length > 0) {
    out.push(`block:warmup_domains:${ctx.warmupBlockDomains.length}`);
  }
  return out;
}

function observationStartPriorityLayerActive(ctx: LiveTrainingObservationContext | null): boolean {
  if (!ctx) return false;
  return (
    ctx.startPriorityPlayerIds.length > 0 ||
    ctx.startPriorityDomains.length > 0 ||
    ctx.startPriorityReinforcementDomains.length > 0 ||
    ctx.startPrioritySummarySignals.length > 0
  );
}

export type IngestLiveTrainingEventBody = {
  rawText: string;
  playerId?: string;
  playerNameRaw?: string;
  eventType?: string;
  category?: string;
  sentiment?: LiveTrainingObservationSentiment;
  confidence?: number | null;
  sourceType?: LiveTrainingEventSourceType;
  /** Непустой → серверный dedupe по (sessionId, clientMutationId) на LiveTrainingEvent. */
  clientMutationId?: string;
};

export type LiveTrainingIngestResultDto = {
  event: {
    id: string;
    sessionId: string;
    sourceType: string;
    rawText: string;
    normalizedText: string | null;
    playerId: string | null;
    playerNameRaw: string | null;
    eventType: string;
    category: string | null;
    sentiment: string | null;
    confidence: number | null;
    needsReview: boolean;
    createdAt: string;
  };
  draft: {
    id: string;
    sessionId: string;
    playerId: string | null;
    playerNameRaw: string | null;
    sourceText: string;
    category: string;
    sentiment: string;
    confidence: number | null;
    needsReview: boolean;
  };
  matching: LiveTrainingMatchingDto;
};

export type LiveTrainingMatchingDto = {
  status: "matched" | "unresolved" | "ambiguous";
  matchedPlayerId: string | null;
};

export function liveTrainingMatchingDtoFromPersistedEvent(ev: {
  playerId: string | null;
  needsReview: boolean;
}): LiveTrainingMatchingDto {
  if (ev.playerId) {
    return { status: "matched", matchedPlayerId: ev.playerId };
  }
  if (ev.needsReview) {
    return { status: "ambiguous", matchedPlayerId: null };
  }
  return { status: "unresolved", matchedPlayerId: null };
}

function toMatchingDto(match: LiveTrainingPlayerMatchResult): LiveTrainingMatchingDto {
  if (match.kind === "resolved") {
    return { status: "matched", matchedPlayerId: match.playerId };
  }
  if (match.kind === "ambiguous") {
    return { status: "ambiguous", matchedPlayerId: null };
  }
  if (match.kind === "unresolved") {
    return { status: "unresolved", matchedPlayerId: null };
  }
  return { status: "matched", matchedPlayerId: null };
}

function eventNeedsReview(match: LiveTrainingPlayerMatchResult): boolean {
  return match.kind === "unresolved" || match.kind === "ambiguous";
}

function roundParserConfidence(x: number): number {
  return Math.min(0.92, Math.round(x * 100) / 100);
}

export async function ingestLiveTrainingEventTx(params: {
  sessionId: string;
  teamId: string;
  body: IngestLiveTrainingEventBody;
  /** PHASE 21: из planning snapshot сессии; null = нет контекста. */
  observationContext?: LiveTrainingObservationContext | null;
}): Promise<LiveTrainingIngestResultDto> {
  const raw = typeof params.body.rawText === "string" ? params.body.rawText : "";
  const normalized = normalizeLiveTrainingEventText(raw);
  if (!normalized) {
    throw new LiveTrainingHttpError("Введите текст наблюдения", 400);
  }

  const sourceType: LiveTrainingEventSourceType =
    params.body.sourceType ?? "manual_stub";

  const speechPolicy = evaluateArenaSpeechPolicy({ raw, normalizedLive: normalized });
  if (!speechPolicy.ok) {
    const msg =
      speechPolicy.hit.code === "prohibited"
        ? "Текст не прошёл проверку"
        : "Текст не подходит для сохранения";
    throw new LiveTrainingHttpError(
      msg,
      400,
      arenaRuntimeOutcomeToHttpBody({
        arenaOutcome: "ignored_by_policy",
        reason: `policy_${speechPolicy.hit.code}`,
        policy: { code: speechPolicy.hit.code, detail: speechPolicy.hit.detail },
      })
    );
  }

  const arenaCtx = await buildArenaRuntimeContext(params.sessionId);
  if (arenaCtx.teamId !== params.teamId) {
    throw new LiveTrainingHttpError("Несоответствие команды сессии", 400);
  }

  const roster = arenaCtx.players.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
  }));

  const parsed = parseLiveTrainingObservationText(normalized, roster);

  const explicitNameRaw =
    typeof params.body.playerNameRaw === "string" ? params.body.playerNameRaw.trim() : "";
  const explicitCategory =
    typeof params.body.category === "string" ? params.body.category.trim() : "";

  const clientPlayerId =
    typeof params.body.playerId === "string" ? params.body.playerId.trim() : "";
  let effectivePlayerId = clientPlayerId;

  if (effectivePlayerId.length > 0) {
    const inArena = arenaCtx.players.some((p) => p.id === effectivePlayerId);
    if (!inArena) {
      throw new LiveTrainingHttpError(
        "Игрок не входит в состав этой тренировки",
        400,
        arenaRuntimeOutcomeToHttpBody({
          arenaOutcome: "invalid_player_context",
          reason: "player_not_in_arena_roster",
        })
      );
    }
  } else {
    const extractedName = (parsed.extractedPlayerNameRaw ?? "").trim();
    const resolutionText = [normalized, explicitNameRaw, extractedName]
      .filter((s) => s.length > 0)
      .join(" ");

    const speechRes = resolvePlayerFromSpeech(resolutionText, arenaCtx.players);
    if (speechRes.status === "ambiguous") {
      throw new LiveTrainingHttpError(
        "Несколько игроков подходят под описание",
        422,
        arenaRuntimeOutcomeToHttpBody({
          arenaOutcome: "needs_clarification",
          reason: "player_resolution_ambiguous",
          speechResolution: speechRes,
        })
      );
    }
    if (speechRes.status === "ok") {
      effectivePlayerId = speechRes.playerId;
    } else {
      const nameHint = explicitNameRaw.length > 0 || extractedName.length > 0;
      if (nameHint) {
        throw new LiveTrainingHttpError(
          "Не удалось однозначно сопоставить игрока",
          422,
          arenaRuntimeOutcomeToHttpBody({
            arenaOutcome: "needs_clarification",
            reason: "player_reference_unresolved",
            speechResolution: speechRes,
          })
        );
      }
    }
  }

  const obsCtx = params.observationContext ?? null;

  const matchPack = matchPlayerForLiveTrainingEvent(
    roster,
    {
      playerId: effectivePlayerId || undefined,
    },
    obsCtx
  );
  const match = matchPack.match;
  const contextAdjustedPlayerMatch = matchPack.contextAdjustedPlayerMatch;
  const eventType =
    typeof params.body.eventType === "string" && params.body.eventType.trim()
      ? params.body.eventType.trim()
      : "observation";

  /** Интерпретация только после прохождения trust; только наблюдение с привязкой к игроку. */
  const arenaInterpretationForPersist =
    eventType === "observation" && match.kind === "resolved"
      ? interpretArenaObservation(normalized)
      : undefined;

  const clientSent = params.body.sentiment;
  const clientSentExplicit =
    clientSent === "positive" || clientSent === "negative" || clientSent === "neutral";

  const nudge = applyObservationContextNudges({
    normalizedText: normalized,
    parsedCategory: parsed.inferredCategory ?? "general_observation",
    parsedSentiment: parsed.inferredSentiment,
    hasExplicitCategory: explicitCategory.length > 0,
    hasExplicitSentiment: clientSentExplicit,
    context: obsCtx,
  });

  const effectiveCategory =
    explicitCategory.length > 0
      ? explicitCategory
      : nudge.categoryOverride ?? parsed.inferredCategory ?? "general_observation";

  const effectiveSentiment: LiveTrainingObservationSentiment | null = clientSentExplicit
    ? clientSent!
    : nudge.sentimentOverride ?? parsed.inferredSentiment ?? null;

  const bc = params.body.confidence;
  const parserConfidenceBeforeContext =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? parsed.confidence
      : null;

  let parserConfidenceAfterContext = parserConfidenceBeforeContext ?? 0.35;
  if (nudge.confidenceBump > 0) {
    parserConfidenceAfterContext = roundParserConfidence(
      parserConfidenceAfterContext + nudge.confidenceBump
    );
  }
  if (contextAdjustedPlayerMatch) {
    const src = matchPack.contextAdjustedPlayerMatchSource;
    const playerBoost =
      src === "focus_block" ? 0.07 : src === "start_priority" ? 0.065 : 0.06;
    parserConfidenceAfterContext = roundParserConfidence(
      parserConfidenceAfterContext + playerBoost
    );
  }

  const resolvedPlayerIdForPriority =
    match.kind === "resolved"
      ? match.playerId
      : effectivePlayerId.length > 0
        ? effectivePlayerId
        : null;

  const spBoost = computeStartPriorityExecutionBoost({
    ctx: obsCtx,
    resolvedPlayerId: resolvedPlayerIdForPriority,
    effectiveCategory,
    effectiveSentiment,
    normalizedText: normalized,
  });

  if (!(typeof bc === "number" && Number.isFinite(bc)) && spBoost.confidenceBump > 0) {
    parserConfidenceAfterContext = roundParserConfidence(
      parserConfidenceAfterContext + spBoost.confidenceBump
    );
  }

  const effectiveConfidence =
    typeof bc === "number" && Number.isFinite(bc)
      ? bc
      : bc === null
        ? null
        : parserConfidenceAfterContext;

  const nameForEvent =
    match.kind === "resolved"
      ? match.displayName
      : explicitNameRaw || parsed.extractedPlayerNameRaw || null;

  const eventNeeds = eventNeedsReview(match);

  const contextUsed = obsCtx != null;
  const blockUsed = observationBlockContextUsed(obsCtx);
  const blockSig = observationBlockContextSignals(obsCtx);
  const contextSignals: string[] = [];
  if (contextUsed) contextSignals.push("context:from_planning_snapshot");
  if (blockUsed) contextSignals.push("block:seed_structure_used");
  contextSignals.push(...blockSig);
  contextSignals.push(...nudge.signals);
  if (contextAdjustedPlayerMatch) {
    contextSignals.push("context:player_match_boosted");
    if (matchPack.contextAdjustedPlayerMatchSource === "focus_block") {
      contextSignals.push("context:player_match_boost_focus_block");
    } else if (matchPack.contextAdjustedPlayerMatchSource === "start_priority") {
      contextSignals.push("context:player_match_boost_start_priority");
    } else if (matchPack.contextAdjustedPlayerMatchSource === "snapshot") {
      contextSignals.push("context:player_match_boost_snapshot");
    }
  }
  if (observationStartPriorityLayerActive(obsCtx)) {
    contextSignals.push("priority:start_layer_active");
  }
  contextSignals.push(...spBoost.signals);

  const parserConfidenceAfterRounded = roundParserConfidence(parserConfidenceAfterContext);

  const contextSuggestionPlayerId =
    contextAdjustedPlayerMatch && match.kind === "resolved" ? match.playerId : null;
  const contextSuggestionPlayerName =
    contextAdjustedPlayerMatch && match.kind === "resolved" ? match.displayName : null;
  const contextSuggestionCategory =
    nudge.adjustedCategory && nudge.categoryOverride ? nudge.categoryOverride : null;
  const contextSuggestionSentiment =
    nudge.adjustedSentiment && nudge.sentimentOverride ? nudge.sentimentOverride : null;

  const ingestProvenanceJson = buildIngestProvenanceJsonValue({
    contextUsed,
    contextSignals,
    contextAdjustedPlayerMatch,
    contextAdjustedCategory: nudge.adjustedCategory,
    contextAdjustedSentiment: nudge.adjustedSentiment,
    parserConfidenceBeforeContext,
    parserConfidenceAfterContext: parserConfidenceAfterRounded,
    contextSuggestionPlayerId,
    contextSuggestionPlayerName,
    contextSuggestionCategory,
    contextSuggestionSentiment,
    blockContextUsed: blockUsed,
    blockContextSignals: blockSig,
    contextAdjustedPlayerMatchSource: contextAdjustedPlayerMatch
      ? matchPack.contextAdjustedPlayerMatchSource
      : null,
    contextAdjustedCategorySource: nudge.adjustedCategory
      ? nudge.contextAdjustedCategorySource
      : null,
    contextAdjustedSentimentSource: nudge.adjustedSentiment
      ? nudge.contextAdjustedSentimentSource
      : null,
    startPriorityUsed: observationStartPriorityLayerActive(obsCtx),
    startPrioritySignals: spBoost.signals,
    startPriorityPlayerHit: spBoost.startPriorityPlayerHit,
    startPriorityDomainHit: spBoost.startPriorityDomainHit,
    startPriorityReinforcementHit: spBoost.startPriorityReinforcementHit,
    ...(arenaInterpretationForPersist
      ? { arenaInterpretation: arenaInterpretationForPersist }
      : {}),
  });

  const draftData = buildDraftFromLiveTrainingEvent({
    sessionId: params.sessionId,
    normalizedSourceText: normalized,
    match,
    inputPlayerNameRaw: explicitNameRaw || parsed.extractedPlayerNameRaw || null,
    category: effectiveCategory,
    sentiment: effectiveSentiment,
    confidence: effectiveConfidence,
    ingestProvenanceJson,
  });

  const payloadJson = {
    parser: {
      extractedPlayerNameRaw: parsed.extractedPlayerNameRaw,
      inferredCategory: parsed.inferredCategory,
      inferredSentiment: parsed.inferredSentiment,
      parserSignals: parsed.parserSignals,
      parserConfidence: parsed.confidence,
    },
    ...(arenaInterpretationForPersist
      ? {
          arenaInterpretation: arenaObservationInterpretationToJson(
            arenaInterpretationForPersist
          ) as Prisma.InputJsonValue,
        }
      : {}),
    applied: {
      usedClientPlayerId: clientPlayerId.length > 0,
      usedClientPlayerNameRaw: explicitNameRaw.length > 0,
      usedClientCategory: explicitCategory.length > 0,
      usedClientSentiment: clientSentExplicit,
      usedClientConfidence: typeof bc === "number" && Number.isFinite(bc),
    },
    contextAssistant: {
      contextUsed,
      contextSignals,
      contextAdjustedPlayerMatch,
      contextAdjustedCategory: nudge.adjustedCategory,
      contextAdjustedSentiment: nudge.adjustedSentiment,
      parserConfidenceBeforeContext,
      parserConfidenceAfterContext: parserConfidenceAfterRounded,
      blockContextUsed: blockUsed,
      blockContextSignals: blockSig,
      contextAdjustedPlayerMatchSource: contextAdjustedPlayerMatch
        ? matchPack.contextAdjustedPlayerMatchSource
        : null,
      contextAdjustedCategorySource: nudge.adjustedCategory
        ? nudge.contextAdjustedCategorySource
        : null,
      contextAdjustedSentimentSource: nudge.adjustedSentiment
        ? nudge.contextAdjustedSentimentSource
        : null,
      startPriorityUsed: observationStartPriorityLayerActive(obsCtx),
      startPrioritySignals: spBoost.signals,
      startPriorityPlayerHit: spBoost.startPriorityPlayerHit,
      startPriorityDomainHit: spBoost.startPriorityDomainHit,
      startPriorityReinforcementHit: spBoost.startPriorityReinforcementHit,
    },
  } as Prisma.InputJsonValue;

  const clientMutationIdPersist =
    typeof params.body.clientMutationId === "string" && params.body.clientMutationId.trim()
      ? params.body.clientMutationId.trim()
      : null;

  const row = await prisma.$transaction(async (tx) => {
    const ev = await tx.liveTrainingEvent.create({
      data: {
        sessionId: params.sessionId,
        sourceType,
        rawText: raw,
        normalizedText: normalized,
        playerId: match.kind === "resolved" ? match.playerId : null,
        playerNameRaw: nameForEvent,
        eventType,
        category: effectiveCategory?.trim() || null,
        sentiment: effectiveSentiment ?? null,
        confidence: effectiveConfidence ?? null,
        needsReview: eventNeeds,
        payloadJson,
        clientMutationId: clientMutationIdPersist,
      },
    });

    const dr = await tx.liveTrainingObservationDraft.create({
      data: {
        ...draftData,
        liveTrainingEventId: ev.id,
      },
    });

    return { ev, dr };
  });

  /** После коммита event+draft — синхронно пересобираем смысл (частые вызовы: last-write wins по одному sessionId). */
  await updateSessionMeaning(params.sessionId);

  return {
    event: {
      id: row.ev.id,
      sessionId: row.ev.sessionId,
      sourceType: row.ev.sourceType,
      rawText: row.ev.rawText,
      normalizedText: row.ev.normalizedText,
      playerId: row.ev.playerId,
      playerNameRaw: row.ev.playerNameRaw,
      eventType: row.ev.eventType,
      category: row.ev.category,
      sentiment: row.ev.sentiment,
      confidence: row.ev.confidence,
      needsReview: row.ev.needsReview,
      createdAt: row.ev.createdAt.toISOString(),
    },
    draft: {
      id: row.dr.id,
      sessionId: row.dr.sessionId,
      playerId: row.dr.playerId,
      playerNameRaw: row.dr.playerNameRaw,
      sourceText: row.dr.sourceText,
      category: row.dr.category,
      sentiment: row.dr.sentiment,
      confidence: row.dr.confidence,
      needsReview: row.dr.needsReview,
    },
    matching: toMatchingDto(match),
  };
}
