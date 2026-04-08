/**
 * AI signals for coach thread — rule-based, on-the-fly (no LLM).
 * v2: Hockey ID context (direct/team, player, team, training hints).
 */

import {
  EMPTY_COACH_AI_SIGNALS_CONTEXT,
  type CoachAiSignalsHockeyContext,
} from "@/lib/messenger/coachConversationAiSignalsContext";

export type AiSignalType = "attention" | "pattern" | "summary";

export type AiSignalPayload = {
  id: string;
  conversationId: string;
  type: AiSignalType;
  text: string;
  createdAt: number;
  relatedMessageIds: string[];
};

type DbMessageLike = {
  id: string;
  text: string;
  senderType: string;
  createdAt: Date;
};

const SUMMARY_MIN_MESSAGES = 8;

const ATTENTION_LONG_PARENT_DIRECT = 220;
/** В командном канале — выше порог, чтобы реже зажигать attention */
const ATTENTION_LONG_PARENT_TEAM = 300;

const ATTENTION_REQUEST_RE =
  /\?|подскаж|скажите|уточн|можно\s+ли|можно\s+узнать|когда\b|почему\b|как\s+бы|как\s+лучше|куда\b|где\s+собира|во\s+сколько|что\s+делать|нужно\s+ли|стоит\s+ли/i;

function isParent(m: DbMessageLike): boolean {
  return m.senderType === "parent";
}

function isCoach(m: DbMessageLike): boolean {
  return m.senderType === "coach";
}

function signalRowId(conversationId: string, type: AiSignalType): string {
  return `${conversationId}:ai-signal:${type}`;
}

function countConsecutiveParentsFromEnd(messages: DbMessageLike[]): { count: number; ids: string[] } {
  const ids: string[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (!isParent(m)) break;
    ids.push(m.id);
  }
  return { count: ids.length, ids: ids.reverse() };
}

function minConsecutiveParentsForAttention(channel: "direct" | "team"): number {
  return channel === "team" ? 3 : 2;
}

function shouldEmitAttention(
  lastParent: DbMessageLike,
  messages: DbMessageLike[],
  channel: "direct" | "team"
): boolean {
  const text = (lastParent.text || "").trim();
  if (text.includes("?")) return true;
  if (ATTENTION_REQUEST_RE.test(text)) return true;

  const minRun = minConsecutiveParentsForAttention(channel);
  const { count } = countConsecutiveParentsFromEnd(messages);
  if (count >= minRun) return true;

  const longThreshold =
    channel === "team" ? ATTENTION_LONG_PARENT_TEAM : ATTENTION_LONG_PARENT_DIRECT;
  if (text.length >= longThreshold) return true;

  return false;
}

/** Короткая ссылка на игрока: только из загруженного контекста */
function playerRefPhrase(ctx: CoachAiSignalsHockeyContext): string | null {
  if (ctx.playerJersey != null) return `игроку №${ctx.playerJersey}`;
  if (ctx.playerFirstLast) return `игроку ${ctx.playerFirstLast}`;
  return null;
}

function truncateTeamName(name: string, max = 36): string {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function attentionCopy(ctx: CoachAiSignalsHockeyContext): string {
  if (ctx.channel === "team") {
    const tn = ctx.teamDisplayName?.trim();
    if (tn) {
      return `В канале «${truncateTeamName(tn)}» появился вопрос — может потребоваться ответ тренера`;
    }
    return "В канале команды появился вопрос, который может требовать ответа";
  }
  const pr = playerRefPhrase(ctx);
  if (pr) {
    return `Родитель ждёт ответа по ${pr} — похоже на вопрос или уточнение`;
  }
  return "Родитель ждёт ответа — похоже на вопрос или уточнение";
}

type PatternBucketKey = "discipline" | "focus" | "errors" | "org";

const PATTERN_BUCKETS: {
  key: PatternBucketKey;
  re: RegExp;
}[] = [
  {
    key: "discipline",
    re: /дисциплин|поведен|нарушен|строг|на\s+замечан/i,
  },
  {
    key: "focus",
    re: /концентрац|внимани|фокус|отвлека|рассеян/i,
  },
  {
    key: "errors",
    re: /ошибк|промах|не\s+так|неточн|промахнул/i,
  },
  {
    key: "org",
    re: /время|место|сбор|опозда|перенос|расписан|где\s+и\s+когда|во\s+сколько|площадк|зал[ае]?\b|арен/i,
  },
];

const PATTERN_BUCKET_PRIORITY: PatternBucketKey[] = [
  "discipline",
  "focus",
  "errors",
  "org",
];

function patternCopy(
  bestKey: PatternBucketKey,
  ctx: CoachAiSignalsHockeyContext
): string {
  if (bestKey === "discipline") {
    return "Повторяется тема дисциплины";
  }
  if (bestKey === "focus") {
    if (ctx.channel === "direct" && ctx.playerFirstLast) {
      return "В переписке повторяется тема концентрации игрока";
    }
    return "Повторяющийся сигнал по концентрации";
  }
  if (bestKey === "errors") {
    return "В переписке повторяется тема ошибок";
  }
  if (bestKey === "org") {
    if (ctx.hasUpcomingTraining && ctx.upcomingTrainingLabel) {
      return `Повторяются организационные уточнения — ближайшая тренировка ${ctx.upcomingTrainingLabel}`;
    }
    return "Повторяются организационные уточнения";
  }
  return "В переписке повторяется заметный паттерн";
}

function computePatternSignal(
  conversationId: string,
  messages: DbMessageLike[],
  now: number,
  ctx: CoachAiSignalsHockeyContext
): AiSignalPayload | null {
  const counts = new Map<PatternBucketKey, { count: number; ids: Set<string> }>();
  for (const b of PATTERN_BUCKETS) {
    counts.set(b.key, { count: 0, ids: new Set() });
  }

  for (const m of messages) {
    const t = m.text || "";
    for (const b of PATTERN_BUCKETS) {
      if (b.re.test(t)) {
        const entry = counts.get(b.key)!;
        entry.count += 1;
        entry.ids.add(m.id);
      }
    }
  }

  let bestKey: PatternBucketKey | null = null;
  let bestCount = 0;
  for (const key of PATTERN_BUCKET_PRIORITY) {
    const c = counts.get(key)!.count;
    if (c > bestCount) {
      bestCount = c;
      bestKey = key;
    }
  }

  if (!bestKey || bestCount < 2) return null;

  const related = [...counts.get(bestKey)!.ids];
  const cap = 14;
  const relatedMessageIds = related.slice(-cap);

  return {
    id: signalRowId(conversationId, "pattern"),
    conversationId,
    type: "pattern",
    text: patternCopy(bestKey, ctx),
    createdAt: now,
    relatedMessageIds,
  };
}

function countParentCoachSwitches(messages: DbMessageLike[]): number {
  let switches = 0;
  for (let i = 1; i < messages.length; i++) {
    const a = messages[i - 1]!;
    const b = messages[i]!;
    const ap = isParent(a);
    const bp = isParent(b);
    const ac = isCoach(a);
    const bc = isCoach(b);
    if ((ap && bc) || (ac && bp)) switches++;
  }
  return switches;
}

function computeSummarySignal(
  conversationId: string,
  messages: DbMessageLike[],
  now: number,
  ctx: CoachAiSignalsHockeyContext
): AiSignalPayload | null {
  if (messages.length <= SUMMARY_MIN_MESSAGES) return null;

  const { count: tailParentRun, ids: tailParentIds } = countConsecutiveParentsFromEnd(messages);
  const switches = countParentCoachSwitches(messages);
  const minSw = Math.max(4, Math.min(6, Math.floor(messages.length / 3)));

  const pr = playerRefPhrase(ctx);
  let text: string;
  let relatedMessageIds: string[];

  if (tailParentRun >= 3) {
    if (ctx.channel === "team") {
      text = "В командном канале накопилось несколько уточнений от родителей";
    } else if (pr) {
      text = `В переписке по ${pr} накопилось несколько уточнений от родителя`;
    } else {
      text = "В треде накопилось несколько уточнений от родителя";
    }
    relatedMessageIds = tailParentIds.slice(-8);
  } else if (switches >= minSw) {
    if (ctx.channel === "team") {
      text = "В командном канале идёт активное обсуждение";
    } else if (pr) {
      text = "В переписке по игроку идёт активное обсуждение";
    } else {
      text = "В переписке идёт активное обсуждение";
    }
    relatedMessageIds = messages.slice(-10).map((m) => m.id);
  } else if (ctx.hasRecentTraining) {
    text = "Обсуждение похоже связано с недавней тренировкой";
    relatedMessageIds = messages.slice(-8).map((m) => m.id);
  } else if (ctx.channel === "team") {
    text = "В командном канале несколько связанных тем";
    relatedMessageIds = messages.slice(-8).map((m) => m.id);
  } else if (pr) {
    text = "В переписке по игроку накопилось несколько связанных вопросов";
    relatedMessageIds = messages.slice(-8).map((m) => m.id);
  } else {
    text = "В переписке несколько связанных вопросов";
    relatedMessageIds = messages.slice(-8).map((m) => m.id);
  }

  return {
    id: signalRowId(conversationId, "summary"),
    conversationId,
    type: "summary",
    text,
    createdAt: now,
    relatedMessageIds,
  };
}

/**
 * Compute signals from ordered messages (oldest first) + grounded Hockey context.
 */
export function computeCoachConversationAiSignals(
  conversationId: string,
  messages: DbMessageLike[],
  ctx: CoachAiSignalsHockeyContext = EMPTY_COACH_AI_SIGNALS_CONTEXT
): AiSignalPayload[] {
  const now = Date.now();
  const out: AiSignalPayload[] = [];

  if (messages.length === 0) return out;

  const last = messages[messages.length - 1]!;
  if (
    isParent(last) &&
    shouldEmitAttention(last, messages, ctx.channel)
  ) {
    const { ids: tailParentIds } = countConsecutiveParentsFromEnd(messages);
    const relatedMessageIds =
      tailParentIds.length >= minConsecutiveParentsForAttention(ctx.channel)
        ? tailParentIds
        : [last.id];

    out.push({
      id: signalRowId(conversationId, "attention"),
      conversationId,
      type: "attention",
      text: attentionCopy(ctx),
      createdAt: last.createdAt.getTime(),
      relatedMessageIds,
    });
  }

  const pattern = computePatternSignal(conversationId, messages, now, ctx);
  if (pattern) out.push(pattern);

  const summary = computeSummarySignal(conversationId, messages, now, ctx);
  if (summary) out.push(summary);

  return out;
}
