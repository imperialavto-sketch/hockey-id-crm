/**
 * PHASE 21: компактный operational context из planning snapshot для ingest наблюдений.
 */

import type { LiveTrainingObservationSentiment } from "@prisma/client";
import type { LiveTrainingPlanningSnapshotDto } from "./live-training-planning-snapshot";

export type LiveTrainingObservationContext = {
  focusPlayerIds: string[];
  /** lowercased первые токены имён из snapshot (для отладки / сигналов). */
  focusPlayerNameTokens: string[];
  focusDomains: string[];
  reinforceDomains: string[];
  summarySignals: string[];
  /** PHASE 32: компактный block-context из planSeeds (без сырого массива blocks). */
  focusBlockPlayerIds: string[];
  mainBlockDomains: string[];
  reinforcementBlockDomains: string[];
  warmupBlockDomains: string[];
  /** PHASE 43: operational subset из planningSnapshot.startPriorities (не весь объект). */
  startPriorityPlayerIds: string[];
  startPriorityDomains: string[];
  /** Если на старте были reinforcement lines — домены закрепления из снимка планирования. */
  startPriorityReinforcementDomains: string[];
  startPrioritySummarySignals: string[];
};

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function normLower(s: string): string {
  return collapse(s).toLowerCase();
}

function firstToken(name: string): string {
  const t = collapse(name).split(/\s+/)[0] ?? "";
  return t;
}

function firstSeedBlockOfType(
  blocks: LiveTrainingPlanningSnapshotDto["planSeeds"]["blocks"],
  type: string
): LiveTrainingPlanningSnapshotDto["planSeeds"]["blocks"][number] | undefined {
  return blocks.find((b) => b.type === type);
}

export function buildLiveTrainingObservationContextFromSnapshot(
  snapshot: LiveTrainingPlanningSnapshotDto | null | undefined
): LiveTrainingObservationContext | null {
  if (!snapshot) return null;

  const carry = snapshot.previousSessionNextActionsCarryV1;
  const hasCarryLayer = Boolean(
    carry &&
      (carry.trainingFocus.length > 0 ||
        carry.teamAccents.length > 0 ||
        carry.players.length > 0)
  );

  const extCarry = snapshot.confirmedExternalDevelopmentCarry;
  const hasExtCarryLayer = Boolean(
    extCarry && extCarry.source === "external_coach" && extCarry.coachName.trim().length > 0
  );

  const fbCarry = snapshot.externalCoachFeedbackCarry;
  const hasFbCarryLayer = Boolean(
    fbCarry && fbCarry.coachName.trim().length > 0 && fbCarry.summary.trim().length > 0
  );

  const carryPlayerIds = (carry?.players ?? [])
    .map((p) => (typeof p.playerId === "string" ? p.playerId.trim() : ""))
    .filter(Boolean);
  const baseFocusPlayerIds = snapshot.focusPlayers.map((p) => p.playerId).filter(Boolean);
  const extCarryPid =
    extCarry?.playerId && typeof extCarry.playerId === "string" ? extCarry.playerId.trim() : "";
  const fbCarryPid =
    fbCarry?.playerId && typeof fbCarry.playerId === "string" ? fbCarry.playerId.trim() : "";
  const focusPlayerIds = [
    ...new Set([
      ...carryPlayerIds,
      ...baseFocusPlayerIds,
      ...(extCarryPid ? [extCarryPid] : []),
      ...(fbCarryPid ? [fbCarryPid] : []),
    ]),
  ].slice(0, 12);

  const carryNameTokens = (carry?.players ?? [])
    .map((p) => normLower(firstToken(p.playerName)))
    .filter((t) => t.length > 0);
  const focusPlayerNameTokens = [
    ...new Set([
      ...carryNameTokens,
      ...snapshot.focusPlayers
        .map((p) => normLower(firstToken(p.playerName)))
        .filter((t) => t.length > 0),
    ]),
  ];
  const focusDomains = [...new Set(snapshot.focusDomains.map((d) => d.domain).filter(Boolean))];
  const reinforceDomains = [...new Set(snapshot.reinforceAreas.map((r) => r.domain).filter(Boolean))];
  const carrySummaryBits = [
    ...(carry?.trainingFocus ?? []).map((s) => collapse(s)).filter(Boolean).slice(0, 3),
    ...(carry?.teamAccents ?? []).map((s) => collapse(s)).filter(Boolean).slice(0, 3),
  ];
  const extCarrySummaryLine =
    hasExtCarryLayer && extCarry
      ? (() => {
          const skillsBit = extCarry.skills.length
            ? collapse(extCarry.skills.slice(0, 4).join(" · "))
            : "";
          const who = extCarryPid ? "игрок из подтверждённого подбора" : "команда";
          const head = `Внешняя работа (${who}): ${collapse(extCarry.coachName)}`;
          return skillsBit ? `${head} — ${skillsBit}`.slice(0, 220) : head.slice(0, 220);
        })()
      : "";
  const fbCarrySummaryLine =
    hasFbCarryLayer && fbCarry
      ? `Отзыв внешнего (${collapse(fbCarry.coachName)}): ${collapse(fbCarry.summary).slice(0, 120)}`
      : "";
  const fbFirstFocus = fbCarry?.focusAreas?.find((x) => typeof x === "string" && x.trim().length > 0);
  const fbCarryFocusLine =
    hasFbCarryLayer && fbCarry && fbFirstFocus
      ? `Фокус после внешней: ${collapse(fbFirstFocus).slice(0, 100)}`
      : "";
  const summarySignals = [
    ...carrySummaryBits,
    ...(extCarrySummaryLine ? [extCarrySummaryLine] : []),
    ...(fbCarrySummaryLine ? [fbCarrySummaryLine] : []),
    ...(fbCarryFocusLine ? [fbCarryFocusLine] : []),
    ...snapshot.summaryLines.map((s) => collapse(s)).filter(Boolean),
  ].slice(0, 8);

  const seedBlocks = Array.isArray(snapshot.planSeeds?.blocks) ? snapshot.planSeeds.blocks : [];
  const focusBlock = firstSeedBlockOfType(seedBlocks, "focus");
  const mainBlock = firstSeedBlockOfType(seedBlocks, "main");
  const reinfBlock = firstSeedBlockOfType(seedBlocks, "reinforcement");
  const warmupBlock = firstSeedBlockOfType(seedBlocks, "warmup");

  const focusBlockPlayerIds = [
    ...new Set(
      (Array.isArray(focusBlock?.focusPlayers) ? focusBlock.focusPlayers : [])
        .map((fp) => (typeof fp.playerId === "string" ? fp.playerId.trim() : ""))
        .filter(Boolean)
    ),
  ];
  const mainBlockDomains = [
    ...new Set(
      (Array.isArray(mainBlock?.linkedDomains) ? mainBlock.linkedDomains : []).filter(
        (d): d is string => typeof d === "string" && d.trim().length > 0
      )
    ),
  ];
  const reinforcementBlockDomains = [
    ...new Set(
      (Array.isArray(reinfBlock?.linkedDomains) ? reinfBlock.linkedDomains : []).filter(
        (d): d is string => typeof d === "string" && d.trim().length > 0
      )
    ),
  ];
  const warmupBlockDomains = [
    ...new Set(
      (Array.isArray(warmupBlock?.linkedDomains) ? warmupBlock.linkedDomains : []).filter(
        (d): d is string => typeof d === "string" && d.trim().length > 0
      )
    ),
  ];

  const sp = snapshot.startPriorities;
  const spActive = Boolean(sp && !sp.lowData);
  let startPriorityPlayerIds: string[] = [];
  let startPriorityDomains: string[] = [];
  let startPriorityReinforcementDomains: string[] = [];
  let startPrioritySummarySignals: string[] = [];
  if (spActive && sp) {
    startPriorityPlayerIds = [
      ...new Set(sp.primaryPlayers.map((p) => p.playerId.trim()).filter(Boolean)),
    ].slice(0, 8);
    startPriorityDomains = [
      ...new Set(sp.primaryDomains.map((d) => d.domain.trim()).filter(Boolean)),
    ].slice(0, 8);
    if (sp.reinforcementItems.length > 0) {
      startPriorityReinforcementDomains = [...reinforceDomains];
    }
    if (typeof sp.summaryLine === "string" && sp.summaryLine.trim()) {
      startPrioritySummarySignals = [collapse(sp.summaryLine)].slice(0, 2);
    }
  }

  const hasStartPriorityLayer =
    startPriorityPlayerIds.length > 0 ||
    startPriorityDomains.length > 0 ||
    startPriorityReinforcementDomains.length > 0 ||
    startPrioritySummarySignals.length > 0;

  if (
    focusPlayerIds.length === 0 &&
    focusDomains.length === 0 &&
    reinforceDomains.length === 0 &&
    summarySignals.length === 0 &&
    focusBlockPlayerIds.length === 0 &&
    mainBlockDomains.length === 0 &&
    reinforcementBlockDomains.length === 0 &&
    warmupBlockDomains.length === 0 &&
    !hasStartPriorityLayer &&
    !hasCarryLayer &&
    !hasExtCarryLayer &&
    !hasFbCarryLayer
  ) {
    return null;
  }

  return {
    focusPlayerIds,
    focusPlayerNameTokens,
    focusDomains,
    reinforceDomains,
    summarySignals,
    focusBlockPlayerIds,
    mainBlockDomains,
    reinforcementBlockDomains,
    warmupBlockDomains,
    startPriorityPlayerIds,
    startPriorityDomains,
    startPriorityReinforcementDomains,
    startPrioritySummarySignals,
  };
}

function hasAny(l: string, needles: string[]): boolean {
  return needles.some((n) => l.includes(n));
}

/** Метрика snapshot → id категории парсера (как в CATEGORY_RULES). */
function domainToParserCategoryId(domain: string): string | null {
  const m: Record<string, string> = {
    pace: "pace",
    behavior: "attention",
    workrate: "effort",
    ofp: "ofp_technique",
    skating: "skating",
    shooting: "shooting",
    puck_control: "puck_control",
    coachability: "attention",
    engagement: "attention",
    general: "general_observation",
  };
  return m[domain] ?? null;
}


/** Слабые текстовые маркеры, согласованные с доменом (только при general_observation). */
function domainWeaklySupportedByText(lower: string, domain: string): boolean {
  switch (domain) {
    case "pace":
      return hasAny(lower, ["быстрее", "медленнее", "темп", "ускор", "замедл", "скорост"]);
    case "behavior":
      return hasAny(lower, ["дисциплин", "тише", "не болтай", "соберись", "слушай"]);
    case "workrate":
      return hasAny(lower, ["лен", "старайся", "добег", "дорабат", "старани"]);
    case "attention":
    case "coachability":
    case "engagement":
      return hasAny(lower, ["внимательн", "слушай", "задан", "соберись", "сфокус", "реакц"]);
    case "shooting":
      return hasAny(lower, ["бросок", "броск", "кисть", "щелчок", "щёлчок"]);
    case "skating":
      return hasAny(lower, ["катани", "дуга", "шаг", "ребр"]);
    case "puck_control":
      return hasAny(lower, ["шайб", "веден", "клюшк"]);
    case "ofp":
      return hasAny(lower, ["присед", "выпад", "корпус", "спин", "ноги", "ниже", "глубже"]);
    default:
      return false;
  }
}

const POSITIVE_FRAGMENTS = [
  "молодец",
  "молодцы",
  "отличн",
  "супер",
  "классн",
  "здорово",
  "умница",
  "хорошо",
];

function hasPraiseFragment(lower: string): boolean {
  return hasAny(lower, POSITIVE_FRAGMENTS);
}

export type ContextAdjustedCategorySource =
  | "snapshot"
  | "main_block"
  | "reinforcement_block"
  | "warmup_block"
  | "start_priority"
  | null;

export type ContextAdjustedSentimentSource = "snapshot" | "reinforcement_block" | null;

export type ObservationContextNudgeResult = {
  categoryOverride: string | null;
  sentimentOverride: LiveTrainingObservationSentiment | null;
  adjustedCategory: boolean;
  adjustedSentiment: boolean;
  confidenceBump: number;
  signals: string[];
  contextAdjustedCategorySource: ContextAdjustedCategorySource;
  contextAdjustedSentimentSource: ContextAdjustedSentimentSource;
};

/**
 * Только nudges: не перекрывает явные поля клиента; не трогает сильный разбор категории.
 */
export function applyObservationContextNudges(params: {
  normalizedText: string;
  parsedCategory: string;
  parsedSentiment: LiveTrainingObservationSentiment | null;
  hasExplicitCategory: boolean;
  hasExplicitSentiment: boolean;
  context: LiveTrainingObservationContext | null;
}): ObservationContextNudgeResult {
  const signals: string[] = [];
  let categoryOverride: string | null = null;
  let sentimentOverride: LiveTrainingObservationSentiment | null = null;
  let adjustedCategory = false;
  let adjustedSentiment = false;
  let confidenceBump = 0;
  let contextAdjustedCategorySource: ContextAdjustedCategorySource = null;
  let contextAdjustedSentimentSource: ContextAdjustedSentimentSource = null;

  const lower = normLower(params.normalizedText);
  const ctx = params.context;
  if (!ctx) {
    return {
      categoryOverride: null,
      sentimentOverride: null,
      adjustedCategory: false,
      adjustedSentiment: false,
      confidenceBump: 0,
      signals: [],
      contextAdjustedCategorySource: null,
      contextAdjustedSentimentSource: null,
    };
  }

  if (
    !params.hasExplicitCategory &&
    params.parsedCategory === "general_observation" &&
    lower.length > 0 &&
    lower.length <= 72
  ) {
    const tryCategoryFromDomains = (
      domains: string[],
      source: NonNullable<ContextAdjustedCategorySource>,
      bump: number,
      signalPrefix: string
    ): boolean => {
      for (const d of domains) {
        if (!domainWeaklySupportedByText(lower, d)) continue;
        const catId = domainToParserCategoryId(d);
        if (catId && catId !== "general_observation") {
          categoryOverride = catId;
          adjustedCategory = true;
          confidenceBump += bump;
          signals.push(`${signalPrefix}:${d}`);
          contextAdjustedCategorySource = source;
          return true;
        }
      }
      return false;
    };

    if (
      !tryCategoryFromDomains(
        ctx.startPriorityDomains,
        "start_priority",
        0.065,
        "context:category_nudge_start_priority_domain"
      )
    ) {
      if (!tryCategoryFromDomains(ctx.mainBlockDomains, "main_block", 0.06, "context:category_nudge_main_block")) {
        if (
          !tryCategoryFromDomains(
            ctx.reinforcementBlockDomains,
            "reinforcement_block",
            0.055,
            "context:category_nudge_reinforcement_block"
          )
        ) {
          if (
            !tryCategoryFromDomains(ctx.focusDomains, "snapshot", 0.05, "context:category_nudge_domain")
          ) {
            tryCategoryFromDomains(
              ctx.warmupBlockDomains,
              "warmup_block",
              0.03,
              "context:category_nudge_warmup_block"
            );
          }
        }
      }
    }
  }

  if (!params.hasExplicitSentiment && params.parsedSentiment == null && hasPraiseFragment(lower)) {
    const startPrioReinfTextMatch = ctx.startPriorityReinforcementDomains.some((d) =>
      domainWeaklySupportedByText(lower, d)
    );
    if (startPrioReinfTextMatch) {
      sentimentOverride = "positive";
      adjustedSentiment = true;
      confidenceBump += 0.048;
      signals.push("context:sentiment_positive_start_priority_reinforcement");
      contextAdjustedSentimentSource = "snapshot";
    } else {
      const blockReinfTextMatch = ctx.reinforcementBlockDomains.some((d) =>
        domainWeaklySupportedByText(lower, d)
      );
      if (blockReinfTextMatch) {
        sentimentOverride = "positive";
        adjustedSentiment = true;
        confidenceBump += 0.05;
        signals.push("context:sentiment_positive_reinforcement_block");
        contextAdjustedSentimentSource = "reinforcement_block";
      } else {
        const snapshotReinfTextMatch = ctx.reinforceDomains.some((d) =>
          domainWeaklySupportedByText(lower, d)
        );
        if (snapshotReinfTextMatch) {
          sentimentOverride = "positive";
          adjustedSentiment = true;
          confidenceBump += 0.04;
          signals.push("context:sentiment_positive_reinforce_domains_text");
          contextAdjustedSentimentSource = "snapshot";
        } else if (ctx.reinforceDomains.length > 0) {
          sentimentOverride = "positive";
          adjustedSentiment = true;
          confidenceBump += 0.04;
          signals.push("context:sentiment_positive_reinforce_domains");
          contextAdjustedSentimentSource = "snapshot";
        }
      }
    }
  }

  return {
    categoryOverride,
    sentimentOverride,
    adjustedCategory,
    adjustedSentiment,
    confidenceBump,
    signals,
    contextAdjustedCategorySource,
    contextAdjustedSentimentSource,
  };
}

/** PHASE 43: доп. boost + сигналы после фиксации category/sentiment/player (не перекрывает явный ввод клиента). */
export type StartPriorityExecutionBoost = {
  confidenceBump: number;
  signals: string[];
  startPriorityPlayerHit: boolean;
  startPriorityDomainHit: boolean;
  startPriorityReinforcementHit: boolean;
};

export function computeStartPriorityExecutionBoost(params: {
  ctx: LiveTrainingObservationContext | null;
  resolvedPlayerId: string | null | undefined;
  effectiveCategory: string;
  effectiveSentiment: LiveTrainingObservationSentiment | null;
  normalizedText: string;
}): StartPriorityExecutionBoost {
  const none: StartPriorityExecutionBoost = {
    confidenceBump: 0,
    signals: [],
    startPriorityPlayerHit: false,
    startPriorityDomainHit: false,
    startPriorityReinforcementHit: false,
  };
  const ctx = params.ctx;
  if (!ctx) return none;
  const hasLayer =
    ctx.startPriorityPlayerIds.length > 0 ||
    ctx.startPriorityDomains.length > 0 ||
    ctx.startPriorityReinforcementDomains.length > 0;
  if (!hasLayer) return none;

  let confidenceBump = 0;
  const signals: string[] = [];
  let startPriorityPlayerHit = false;
  let startPriorityDomainHit = false;
  let startPriorityReinforcementHit = false;

  const pid = typeof params.resolvedPlayerId === "string" ? params.resolvedPlayerId.trim() : "";
  if (pid && ctx.startPriorityPlayerIds.includes(pid)) {
    startPriorityPlayerHit = true;
    confidenceBump += 0.03;
    signals.push("priority:start_player_match");
  }

  const cat = (params.effectiveCategory || "").trim();
  if (cat && ctx.startPriorityDomains.length > 0) {
    for (const d of ctx.startPriorityDomains) {
      const mapped = domainToParserCategoryId(d);
      if (mapped && mapped === cat) {
        startPriorityDomainHit = true;
        confidenceBump += 0.025;
        signals.push(`priority:start_domain_aligned:${d}`);
        break;
      }
    }
  }

  const lower = normLower(params.normalizedText);
  if (params.effectiveSentiment === "positive" && ctx.startPriorityReinforcementDomains.length > 0) {
    let hit = false;
    for (const d of ctx.startPriorityReinforcementDomains) {
      if (domainWeaklySupportedByText(lower, d)) {
        hit = true;
        break;
      }
    }
    if (!hit && hasPraiseFragment(lower)) {
      for (const d of ctx.startPriorityReinforcementDomains) {
        const mapped = domainToParserCategoryId(d);
        if (mapped && mapped === cat) {
          hit = true;
          break;
        }
      }
    }
    if (hit) {
      startPriorityReinforcementHit = true;
      confidenceBump += 0.022;
      signals.push("priority:start_reinforcement_positive");
    }
  }

  return {
    confidenceBump: Math.min(0.1, confidenceBump),
    signals,
    startPriorityPlayerHit,
    startPriorityDomainHit,
    startPriorityReinforcementHit,
  };
}
