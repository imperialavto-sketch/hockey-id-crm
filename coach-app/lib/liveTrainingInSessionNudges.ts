/**
 * In-session coach nudges: лёгкие эвристики по уже зафиксированным событиям live training.
 * Без AI и без нового backend — только локальные счётчики.
 */

import { formatLiveTrainingMetricDomain } from "@/lib/liveTrainingMetricDomainLabel";
import {
  buildNeedsAttentionActionPayload,
  buildTeamFocusActionPayload,
  type InSessionNudgeActionPayload,
} from "@/lib/liveTrainingInSessionNudgeActions";
import {
  buildNudgeAttentionLineRu,
  buildNudgeAttentionTts,
  buildNudgePositiveStreakLineRu,
  buildNudgeRepeatedDomainLineRu,
  buildNudgeRepeatedPlayerLineRu,
  buildNudgeSessionThemeLineRu,
  buildNudgeTeamThemeLineRu,
} from "@/lib/arenaAssistantBehavior";

export type InSessionNudgeType =
  | "needs_attention_player"
  | "repeated_player_focus"
  | "repeated_domain_focus"
  | "repeated_team_theme"
  | "repeated_session_theme"
  | "positive_player_streak";

/** Минимальный срез события для эвристик (серверные события + локальная очередь). */
export type InSessionNudgeEventInput = {
  playerId: string | null;
  playerNameRaw: string | null;
  category: string | null;
  sentiment: string | null;
  /** Текст для описания задачи из nudge (normalized/raw) */
  textSnippet?: string | null;
};

export type { InSessionNudgeActionPayload } from "@/lib/liveTrainingInSessionNudgeActions";

export type InSessionNudgeActionOffer = {
  ctaLabelRu: string;
  payload: InSessionNudgeActionPayload;
};

const THRESH = {
  playerRepeat: 3,
  domainRepeat: 3,
  teamRepeat: 2,
  sessionRepeat: 2,
  negativePerPlayer: 3,
  positivePerPlayer: 2,
} as const;

const PRIORITY: Record<InSessionNudgeType, number> = {
  needs_attention_player: 100,
  repeated_player_focus: 82,
  repeated_domain_focus: 68,
  repeated_team_theme: 55,
  repeated_session_theme: 54,
  positive_player_streak: 45,
};

export const IN_SESSION_NUDGE_DEFAULTS = {
  cooldownMs: 75_000,
  sameKeyCooldownMs: 180_000,
  maxPerSession: 7,
} as const;

export type InSessionNudgeCandidate = {
  type: InSessionNudgeType;
  /** Стабильный ключ для анти-спама */
  dedupeKey: string;
  priority: number;
  /** Одна строка для баннера */
  lineRu: string;
  /** Очень короткая фраза для TTS (только для части типов) */
  speakRu?: string;
  ttsEligible: boolean;
  /** Одна CTA → createActionItem, если задано */
  action?: InSessionNudgeActionOffer;
};

export type InSessionNudgeGateState = {
  emitCount: number;
  lastEmitAt: number;
  keyLastEmitAt: Record<string, number>;
};

export function createInSessionNudgeGateState(): InSessionNudgeGateState {
  return { emitCount: 0, lastEmitAt: 0, keyLastEmitAt: {} };
}

export function tryAcceptInSessionNudgeMutable(
  now: number,
  state: InSessionNudgeGateState,
  candidate: InSessionNudgeCandidate,
  opts: typeof IN_SESSION_NUDGE_DEFAULTS = IN_SESSION_NUDGE_DEFAULTS
): boolean {
  if (state.emitCount >= opts.maxPerSession) return false;
  if (state.lastEmitAt > 0 && now - state.lastEmitAt < opts.cooldownMs) return false;
  const prevKey = state.keyLastEmitAt[candidate.dedupeKey];
  if (prevKey != null && now - prevKey < opts.sameKeyCooldownMs) return false;
  state.emitCount += 1;
  state.lastEmitAt = now;
  state.keyLastEmitAt[candidate.dedupeKey] = now;
  return true;
}

function shortPlayerLabel(name: string): string {
  const t = name.trim().split(/\s+/)[0];
  return t || name;
}

function resolvePlayerLabel(
  key: string,
  rosterNameById: Record<string, string> | undefined
): string {
  if (key.startsWith("id:")) {
    const id = key.slice(3);
    const n = rosterNameById?.[id];
    if (n) return shortPlayerLabel(n);
  }
  if (key.startsWith("name:")) {
    return shortPlayerLabel(key.slice(5));
  }
  return "игрок";
}

function playerGroupKey(ev: InSessionNudgeEventInput): string | null {
  if (ev.playerId && ev.playerId.trim()) return `id:${ev.playerId.trim()}`;
  const raw = ev.playerNameRaw?.trim();
  if (raw) return `name:${raw.toLowerCase()}`;
  return null;
}

type ParsedCategory =
  | { kind: "team" }
  | { kind: "session" }
  | { kind: "domain"; key: string }
  | { kind: "other" };

function parseArenaCategory(category: string | null): ParsedCategory {
  const c = (category ?? "").trim().toLowerCase();
  if (!c.startsWith("arena:")) return { kind: "other" };
  const tail = c.slice("arena:".length);
  const base = tail.split("|")[0]?.trim() ?? "";
  if (base === "team") return { kind: "team" };
  if (base === "session") return { kind: "session" };
  if (base.length > 0) return { kind: "domain", key: base };
  return { kind: "other" };
}

function normSentiment(s: string | null): "positive" | "negative" | "neutral" | null {
  const t = (s ?? "").trim().toLowerCase();
  if (t === "positive" || t === "negative" || t === "neutral") return t;
  return null;
}

/**
 * Собирает кандидатов, отсортированных по приоритету (сначала сильнее).
 */
export function buildInSessionNudgeCandidates(
  events: InSessionNudgeEventInput[],
  rosterNameById?: Record<string, string>,
  /** Подпись в задаче «командный фокус» */
  sessionTeamName?: string | null
): InSessionNudgeCandidate[] {
  const byPlayer = new Map<string, number>();
  const negByPlayer = new Map<string, number>();
  const posByPlayer = new Map<string, number>();
  const negSnippetsByPk = new Map<string, string[]>();
  let teamCount = 0;
  let sessionCount = 0;
  const byDomain = new Map<string, number>();

  for (const ev of events) {
    const pk = playerGroupKey(ev);
    if (pk) {
      byPlayer.set(pk, (byPlayer.get(pk) ?? 0) + 1);
      const sent = normSentiment(ev.sentiment);
      if (sent === "negative") {
        negByPlayer.set(pk, (negByPlayer.get(pk) ?? 0) + 1);
        const sn = (ev.textSnippet ?? "").trim();
        if (sn) {
          const arr = negSnippetsByPk.get(pk) ?? [];
          arr.push(sn);
          negSnippetsByPk.set(pk, arr);
        }
      } else if (sent === "positive") {
        posByPlayer.set(pk, (posByPlayer.get(pk) ?? 0) + 1);
      }
    }

    const cat = parseArenaCategory(ev.category);
    if (cat.kind === "team") teamCount += 1;
    else if (cat.kind === "session") sessionCount += 1;
    else if (cat.kind === "domain") {
      byDomain.set(cat.key, (byDomain.get(cat.key) ?? 0) + 1);
    }
  }

  const out: InSessionNudgeCandidate[] = [];

  for (const [pk, n] of negByPlayer) {
    if (n >= THRESH.negativePerPlayer) {
      const label = resolvePlayerLabel(pk, rosterNameById);
      const playerId = pk.startsWith("id:") ? pk.slice(3) : undefined;
      const snippets = negSnippetsByPk.get(pk) ?? [];
      out.push({
        type: "needs_attention_player",
        dedupeKey: `needs_attention_player:${pk}`,
        priority: PRIORITY.needs_attention_player,
        lineRu: buildNudgeAttentionLineRu(label),
        speakRu: buildNudgeAttentionTts(label),
        ttsEligible: true,
        action: {
          ctaLabelRu: "Создать задачу",
          payload: buildNeedsAttentionActionPayload({
            playerLabel: label,
            playerId,
            negativeCount: n,
            snippets,
          }),
        },
      });
    }
  }

  for (const [pk, n] of byPlayer) {
    if (n >= THRESH.playerRepeat) {
      const label = resolvePlayerLabel(pk, rosterNameById);
      out.push({
        type: "repeated_player_focus",
        dedupeKey: `repeated_player_focus:${pk}`,
        priority: PRIORITY.repeated_player_focus,
        lineRu: buildNudgeRepeatedPlayerLineRu(label),
        ttsEligible: false,
      });
    }
  }

  for (const [dk, n] of byDomain) {
    if (n >= THRESH.domainRepeat) {
      const domRu = formatLiveTrainingMetricDomain(dk);
      out.push({
        type: "repeated_domain_focus",
        dedupeKey: `repeated_domain_focus:${dk}`,
        priority: PRIORITY.repeated_domain_focus,
        lineRu: buildNudgeRepeatedDomainLineRu(domRu),
        ttsEligible: false,
      });
    }
  }

  if (teamCount >= THRESH.teamRepeat) {
    out.push({
      type: "repeated_team_theme",
      dedupeKey: "repeated_team_theme",
      priority: PRIORITY.repeated_team_theme,
      lineRu: buildNudgeTeamThemeLineRu(),
      ttsEligible: false,
      action: {
        ctaLabelRu: "В план",
        payload: buildTeamFocusActionPayload(sessionTeamName ?? undefined),
      },
    });
  }

  if (sessionCount >= THRESH.sessionRepeat) {
    out.push({
      type: "repeated_session_theme",
      dedupeKey: "repeated_session_theme",
      priority: PRIORITY.repeated_session_theme,
      lineRu: buildNudgeSessionThemeLineRu(),
      ttsEligible: false,
    });
  }

  for (const [pk, n] of posByPlayer) {
    if (n >= THRESH.positivePerPlayer) {
      const label = resolvePlayerLabel(pk, rosterNameById);
      out.push({
        type: "positive_player_streak",
        dedupeKey: `positive_player_streak:${pk}`,
        priority: PRIORITY.positive_player_streak,
        lineRu: buildNudgePositiveStreakLineRu(label),
        ttsEligible: false,
      });
    }
  }

  out.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.dedupeKey.localeCompare(b.dedupeKey);
  });

  const seen = new Set<string>();
  return out.filter((c) => {
    if (seen.has(c.dedupeKey)) return false;
    seen.add(c.dedupeKey);
    return true;
  });
}

export function liveTrainingEventToNudgeInput(ev: {
  playerId: string | null;
  playerNameRaw: string | null;
  category: string | null;
  sentiment: string | null;
  normalizedText?: string | null;
  rawText?: string | null;
}): InSessionNudgeEventInput {
  const snippet = (ev.normalizedText ?? ev.rawText ?? "").trim() || null;
  return {
    playerId: ev.playerId,
    playerNameRaw: ev.playerNameRaw,
    category: ev.category,
    sentiment: ev.sentiment,
    textSnippet: snippet,
  };
}

export function liveTrainingOutboxBodyToNudgeInput(body: {
  playerId?: string;
  playerNameRaw?: string;
  category?: string;
  sentiment?: "positive" | "negative" | "neutral";
  rawText?: string;
}): InSessionNudgeEventInput {
  const rt = body.rawText?.trim();
  return {
    playerId: body.playerId?.trim() ? body.playerId : null,
    playerNameRaw: body.playerNameRaw?.trim() ? body.playerNameRaw : null,
    category: body.category ?? null,
    sentiment: body.sentiment ?? null,
    textSnippet: rt || null,
  };
}
