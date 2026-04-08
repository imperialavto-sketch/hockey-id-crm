/**
 * Семантический парсер команд «Арена» (MVP): интенты, хоккейный контекст, уточнения.
 */

import type { ArenaConversationContext, ArenaTargetType } from "@/lib/arenaConversationContext";
import {
  ARENA_CLARIFY_MEANING_DETAIL,
  ARENA_CLARIFY_MEANING_SHORT,
  ARENA_CLARIFY_PLAYER_AMBIGUOUS,
  ARENA_CLARIFY_PLAYER_CONTINUATION,
  ARENA_CLARIFY_TARGET_PICK,
} from "@/lib/arenaVoicePhrases";
import { formatArenaCategoryTag, matchHockeyOntology } from "@/lib/arenaHockeyOntology";
import { normalizeArenaTranscript, normalizeForWakeMatch } from "@/lib/arenaTranscriptNormalizer";
import type { LiveTrainingSentiment } from "@/types/liveTraining";

export type ArenaIntentKind =
  | "start_session"
  | "finish_session"
  | "resume_session"
  | "pause_timer"
  | "resume_timer"
  | "create_player_observation"
  | "create_team_observation"
  | "create_session_observation"
  | "reassign_last_observation"
  | "delete_last_observation"
  | "ask_last_observation_status"
  | "unknown";

export type ArenaParsedIntent =
  | { kind: "start_session" }
  | { kind: "finish_session" }
  | { kind: "resume_session" }
  | { kind: "pause_timer" }
  | { kind: "resume_timer" }
  | {
      kind: "create_player_observation";
      rawText: string;
      playerId: string;
      sentiment: LiveTrainingSentiment;
      domain: string | null;
      skill: string | null;
      category: string;
      needsReview: boolean;
      confidence: number;
    }
  | {
      kind: "create_team_observation";
      rawText: string;
      sentiment: LiveTrainingSentiment;
      domain: string | null;
      skill: string | null;
      category: string;
      needsReview: boolean;
      confidence: number;
    }
  | {
      kind: "create_session_observation";
      rawText: string;
      sentiment: LiveTrainingSentiment;
      domain: string | null;
      skill: string | null;
      category: string;
      needsReview: boolean;
      confidence: number;
    }
  | { kind: "reassign_last_observation"; playerHint: string }
  | { kind: "delete_last_observation" }
  | { kind: "ask_last_observation_status" }
  | { kind: "unknown"; rawTranscript: string };

export type ArenaClarificationType = "player" | "target" | "meaning";

export type RosterEntry = {
  id: string;
  name: string;
  position?: string;
  /** Опционально: усиливают матчинг при STT (именительные формы). */
  firstName?: string;
  lastName?: string;
};

/** Снимок частично разобранного наблюдения для pending clarification */
export type ArenaPendingObservationPayload = {
  rawForStorage: string;
  workNormalized: string;
  sentiment: LiveTrainingSentiment;
  domain: string | null;
  skill: string | null;
  ontoConfidence: number;
  continuation: boolean;
};

export type ArenaParseResult =
  | { ok: true; intent: ArenaParsedIntent }
  | {
      ok: false;
      requiresClarification: true;
      clarificationType: ArenaClarificationType;
      prompt: string;
      pendingObservation: ArenaPendingObservationPayload;
      candidates?: RosterEntry[];
    };

/** Полная STT-нормализация для парсинга (делегирует в arenaTranscriptNormalizer). */
export function normalizeArenaText(s: string): string {
  return normalizeArenaTranscript(s);
}

/**
 * JS `\b` only treats [A-Za-z0-9_] as word chars — it breaks for Cyrillic.
 * Match «арена» as a token with explicit boundaries.
 */
const RE_ARENA_TOKEN =
  /(^|[\s.,;:!?«»"'()[\]{}—–-])арена(?=[\s.,;:!?«»"'()[\]{}—–-]|$)/i;

/** Same idea: token must start after line/start/punctuation, not inside another word */
const RU_TOK = "(?:^|[\\s.,;:!?«»\"'()\\[\\]{}—–-])";

export function transcriptContainsWakeWord(transcript: string): boolean {
  const t = normalizeForWakeMatch(transcript);
  return RE_ARENA_TOKEN.test(t);
}

export function stripWakeWordFromTranscript(transcript: string): string {
  let t = normalizeForWakeMatch(transcript);
  t = t.replace(RE_ARENA_TOKEN, "$1 ").replace(/\s+/g, " ").trim();
  return normalizeArenaTranscript(t);
}

export function matchRosterHint(hint: string, roster: RosterEntry[]): RosterEntry | null {
  return pickSingleRosterMatch(normalizeArenaTranscript(hint), roster);
}

function pickSingleRosterMatch(textNorm: string, roster: RosterEntry[]): RosterEntry | null {
  const all = collectRosterMatches(textNorm, roster);
  if (all.length === 1) return all[0]!;
  return null;
}

function expandRosterNameParts(r: RosterEntry): string[] {
  const s = new Set<string>();
  const add = (x?: string) => {
    const t = normalizeArenaText((x ?? "").trim());
    if (t.length >= 2) s.add(t);
  };
  add(r.name);
  add(r.firstName);
  add(r.lastName);
  for (const p of normalizeArenaText(r.name).split(/\s+/)) add(p);
  return [...s];
}

/** Слово из STT и токен ростера (имя/фамилия): учёт коротких словоформ без морфологии. */
function wordMatchesRosterToken(word: string, token: string): boolean {
  if (word.length < 2 || token.length < 2) return false;
  if (word === token) return true;
  if (token.length >= 3 && word.startsWith(token) && word.length <= token.length + 3) return true;
  if (
    token.length >= 4 &&
    word.startsWith(token.slice(0, -1)) &&
    word.length >= token.length - 1 &&
    word.length <= token.length + 2
  ) {
    return true;
  }
  if (word.length >= 3 && token.startsWith(word) && token.length <= word.length + 3) return true;
  return false;
}

function textReferencesTokenWordLevel(textNorm: string, token: string): boolean {
  if (token.length < 3) return false;
  const words = textNorm.split(/[\s.,;:!?«»"'()[\]{}—–-]+/).filter(Boolean);
  return words.some((w) => wordMatchesRosterToken(w, token));
}

function collectRosterMatches(textNorm: string, roster: RosterEntry[]): RosterEntry[] {
  const out: RosterEntry[] = [];
  const seen = new Set<string>();
  const sorted = [...roster].sort((a, b) => b.name.length - a.name.length);
  for (const r of sorted) {
    const nn = normalizeArenaText(r.name);
    if (!nn || seen.has(r.id)) continue;

    if (textNorm.includes(nn)) {
      out.push(r);
      seen.add(r.id);
      continue;
    }

    let hit = false;
    const nameParts = nn.split(/\s+/).filter((p) => p.length >= 3);
    if (nameParts.length >= 2) {
      const [a, b] = nameParts;
      if (textNorm.includes(a) && textNorm.includes(b)) hit = true;
    }
    if (!hit) {
      const extra = expandRosterNameParts(r);
      hit = extra.some(
        (t) => t.length >= 3 && (textNorm.includes(t) || textReferencesTokenWordLevel(textNorm, t))
      );
    }
    if (!hit) {
      const first = nn.split(/\s+/)[0];
      if (
        first &&
        first.length >= 4 &&
        (textNorm.includes(first) || textReferencesTokenWordLevel(textNorm, first))
      ) {
        hit = true;
      }
    }
    if (hit) {
      out.push(r);
      seen.add(r.id);
    }
  }
  return dedupeRoster(out);
}

function dedupeRoster(items: RosterEntry[]): RosterEntry[] {
  const m = new Map<string, RosterEntry>();
  for (const x of items) m.set(x.id, x);
  return [...m.values()];
}

function inferSentiment(textNorm: string): LiveTrainingSentiment {
  if (
    /(плохо|ужасно|слаб|неудач|ошиб|минус|отстает|отстаёт|недостаточно|плохая|плохой|низк|темп\s+низк|низкий\s+темп|медленн|вяло|вялый|не\s+возвращ|выключается|выключился|слабый\s+выход|выход\s+слаб)/.test(
      textNorm
    )
  ) {
    return "negative";
  }
  if (/(хорошо|отлично|молодец|супер|плюс|сильн|класс|здорово|стабильн)/.test(textNorm)) {
    return "positive";
  }
  return "neutral";
}

const RE_START =
  /(начать|начинаем|стартуем|новая)\s+(тренировк|сессию)|начать\s+тренировку|^начинаем$|^стартуем$/;
/** После wake: только таймер; «стоп» без «тренировку» не попадает в RE_FINISH. */
const RE_PAUSE_TIMER = /^(пауза|стоп|поставь\s+на\s+паузу)$/;
/** Раньше RE_RESUME: короткие «продолжить/возобновить» → таймер; «продолжаем» / длинные фразы — прежний resume_session. */
const RE_RESUME_TIMER = /^(продолжить|продолжай|возобновить|возобнови)$/;
/** Одиночные глаголы после «Арена» (STT часто не даёт «…тренировку»). «стоп» без объекта — пауза таймера (RE_PAUSE_TIMER). */
const RE_FINISH_BARE = /^(завершить|закончить|завершай)$/;
/** Склейка STT без пробела: «завершитьтренировку». */
const RE_FINISH_GLUED = /^(завершить|закончить)тренировк/;
const RE_FINISH =
  /(закончить|завершить|стоп|конец)\s+(тренировк|сессию)|закончить\s+тренировку|завершить\s+тренировку/;
const RE_RESUME = /продолж(ить|аем)|верн(ись|емся)\s+к\s+тренировк|возобнов/;
const RE_DELETE = /(удали|убери|отмени)\s+(последн|последнее|это|запись)/;
const RE_STATUS =
  /что\s+ты\s+записал|что\s+ты\s+записала|что\s+записан|что\s+записано|что\s+там\s+последн|повтори\s+последн|статус\s+последн|какое\s+последн/;

const RE_REASSIGN =
  /(?:это\s+было\s+про|про\s+игрока|игрок\s+|переназнач(?:ь|ить)\s+на\s+)(.+)$/;

const RE_CONTINUATION = /^(и\s+ещё|и\s+еще|ещё|еще|а\s+ещё|а\s+еще|также|плюс)\s+/i;

const RE_TEAM = new RegExp(
  `${RU_TOK}(пятёрк|пятёрка|пятерк|пятерка|звен|ребятам|ребята|команда\\s+плох|вся\\s+команда|все\\s+плох)`,
  "i"
);
/** Без «плохо выходит из зоны» — такая фраза идёт в target clarification */
const RE_TEAM2 =
  /в\s+зоне\s+нападен|работа\s+пятёрк|выход\s+пятёрк|выходит\s+из\s+зон|выходят\s+из\s+зон/;

const RE_SESSION = new RegExp(
  `${RU_TOK}(сегодня|на\\s+этой\\s+тренировк|на\\s+тренировк|темп\\s+низк|темп\\s+высок|в\\s+целом|по\\s+сессии|у\\s+нас\\s+слаб)`,
  "i"
);

function scoreObservationStrength(
  textNorm: string,
  ontologyConf: number,
  hasPlayer: boolean,
  continuation: boolean,
  targetHint: ArenaTargetType | null
): number {
  let s = 0.15;
  if (textNorm.length >= 12) s += 0.12;
  if (textNorm.length >= 24) s += 0.08;
  if (ontologyConf > 0) s += 0.28 * ontologyConf;
  if (hasPlayer) s += 0.22;
  if (continuation) s += 0.18;
  if (targetHint === "team" || targetHint === "session") s += 0.12;
  const sent = inferSentiment(textNorm);
  if (sent !== "neutral") s += 0.08;
  return Math.min(1, s);
}

function makePendingObservationPayload(
  rawForStorage: string,
  workNormalized: string,
  sentiment: LiveTrainingSentiment,
  onto: { domain: string | null; skill: string | null; confidence: number },
  continuation: boolean
): ArenaPendingObservationPayload {
  return {
    rawForStorage,
    workNormalized,
    sentiment,
    domain: onto.domain,
    skill: onto.skill,
    ontoConfidence: onto.confidence,
    continuation,
  };
}

/** Сборка интента наблюдения после clarification (экспорт для resolver). */
export function buildArenaObservationIntent(args: {
  target: ArenaTargetType;
  rawDisplay: string;
  playerId: string | null;
  sentiment: LiveTrainingSentiment;
  domain: string | null;
  skill: string | null;
  confidence: number;
}): ArenaParsedIntent {
  const needsReview = args.target !== "player" || args.confidence < 0.55;
  const category = formatArenaCategoryTag(
    args.target === "player" ? "player" : args.target,
    args.domain,
    args.skill
  );
  const base = {
    rawText: args.rawDisplay,
    sentiment: args.sentiment,
    domain: args.domain,
    skill: args.skill,
    category,
    needsReview,
    confidence: args.confidence,
  };
  if (args.target === "player" && args.playerId) {
    return {
      kind: "create_player_observation",
      ...base,
      playerId: args.playerId,
    };
  }
  if (args.target === "team") {
    return { kind: "create_team_observation", ...base };
  }
  return { kind: "create_session_observation", ...base };
}

/**
 * Полный разбор команды после wake word (или целой фразы с «Арена»).
 */
export function parseArenaCommand(
  transcript: string,
  roster: RosterEntry[],
  ctx: ArenaConversationContext
): ArenaParseResult {
  const raw = transcript.trim();
  if (!raw) return { ok: true, intent: { kind: "unknown", rawTranscript: raw } };

  const cmd = stripWakeWordFromTranscript(raw);
  const n = normalizeArenaText(cmd);
  if (!n) return { ok: true, intent: { kind: "unknown", rawTranscript: raw } };

  if (RE_DELETE.test(n)) {
    return { ok: true, intent: { kind: "delete_last_observation" } };
  }

  if (RE_STATUS.test(n)) {
    return { ok: true, intent: { kind: "ask_last_observation_status" } };
  }

  if (RE_START.test(n)) {
    return { ok: true, intent: { kind: "start_session" } };
  }

  if (RE_PAUSE_TIMER.test(n)) {
    return { ok: true, intent: { kind: "pause_timer" } };
  }

  if (RE_FINISH_BARE.test(n) || RE_FINISH_GLUED.test(n) || RE_FINISH.test(n)) {
    return { ok: true, intent: { kind: "finish_session" } };
  }

  if (RE_RESUME_TIMER.test(n)) {
    return { ok: true, intent: { kind: "resume_timer" } };
  }

  if (RE_RESUME.test(n)) {
    return { ok: true, intent: { kind: "resume_session" } };
  }

  const reassign = n.match(RE_REASSIGN);
  if (reassign?.[1]) {
    const hint = reassign[1].trim();
    if (hint.length >= 2) {
      return { ok: true, intent: { kind: "reassign_last_observation", playerHint: hint } };
    }
  }

  let continuation = false;
  let work = n;
  if (RE_CONTINUATION.test(n)) {
    continuation = true;
    work = n.replace(RE_CONTINUATION, "").trim();
  }

  const rawForStorage = raw.length > 0 ? raw : cmd;

  const onto = matchHockeyOntology(work);
  const sentiment = inferSentiment(work);

  if (/^(отметь|запиши|зафиксируй|запомни)(ь|и)?$/.test(work)) {
    return {
      ok: false,
      requiresClarification: true,
      clarificationType: "meaning",
      prompt: ARENA_CLARIFY_MEANING_DETAIL,
      pendingObservation: makePendingObservationPayload(
        rawForStorage,
        work,
        sentiment,
        onto,
        continuation
      ),
    };
  }

  const explicitTeam = RE_TEAM.test(work) || RE_TEAM2.test(work);
  const explicitSession = RE_SESSION.test(work) && !explicitTeam;

  let playerFromText: RosterEntry | null = null;
  const matches = collectRosterMatches(work, roster);
  if (matches.length >= 2) {
    return {
      ok: false,
      requiresClarification: true,
      clarificationType: "player",
      prompt: ARENA_CLARIFY_PLAYER_AMBIGUOUS,
      pendingObservation: makePendingObservationPayload(
        rawForStorage,
        work,
        sentiment,
        onto,
        continuation
      ),
      candidates: matches,
    };
  }
  if (matches.length === 1) {
    playerFromText = matches[0]!;
  }

  if (continuation && !playerFromText) {
    if (ctx.lastReferencedPlayer) {
      playerFromText = {
        id: ctx.lastReferencedPlayer.id,
        name: ctx.lastReferencedPlayer.name,
      };
    } else {
      return {
        ok: false,
        requiresClarification: true,
        clarificationType: "player",
        prompt: ARENA_CLARIFY_PLAYER_CONTINUATION,
        pendingObservation: makePendingObservationPayload(
          rawForStorage,
          work,
          sentiment,
          onto,
          continuation
        ),
      };
    }
  }

  let target: ArenaTargetType | null = null;
  if (playerFromText) target = "player";
  else if (explicitTeam) target = "team";
  else if (explicitSession) target = "session";

  if (!target) {
    const strength = scoreObservationStrength(
      work,
      onto.confidence,
      false,
      continuation,
      null
    );
    if (work.length < 8 && onto.confidence < 0.5) {
      return {
        ok: false,
        requiresClarification: true,
        clarificationType: "meaning",
        prompt: ARENA_CLARIFY_MEANING_DETAIL,
        pendingObservation: makePendingObservationPayload(
          rawForStorage,
          work,
          sentiment,
          onto,
          continuation
        ),
      };
    }
    if (strength >= 0.42 && (onto.confidence > 0.45 || sentiment !== "neutral" || work.length >= 18)) {
      if (onto.domain && /темп|сегодня|тренировк|сесс|в\s+целом/.test(work)) {
        target = "session";
      } else if (onto.domain && /зон|пятёр|команда|выход/.test(work)) {
        target = "team";
      } else if (strength >= 0.5) {
        return {
          ok: false,
          requiresClarification: true,
          clarificationType: "target",
          prompt: ARENA_CLARIFY_TARGET_PICK,
          pendingObservation: makePendingObservationPayload(
            rawForStorage,
            work,
            sentiment,
            onto,
            continuation
          ),
        };
      } else {
        return {
          ok: false,
          requiresClarification: true,
          clarificationType: "meaning",
          prompt: ARENA_CLARIFY_MEANING_SHORT,
          pendingObservation: makePendingObservationPayload(
            rawForStorage,
            work,
            sentiment,
            onto,
            continuation
          ),
        };
      }
    } else {
      return { ok: true, intent: { kind: "unknown", rawTranscript: raw } };
    }
  }

  const conf = scoreObservationStrength(
    work,
    onto.confidence,
    target === "player",
    continuation,
    target
  );

  if (target === "player" && playerFromText) {
    return {
      ok: true,
      intent: buildArenaObservationIntent({
        target: "player",
        rawDisplay: rawForStorage,
        playerId: playerFromText.id,
        sentiment,
        domain: onto.domain,
        skill: onto.skill,
        confidence: conf,
      }),
    };
  }

  if (target === "team") {
    return {
      ok: true,
      intent: buildArenaObservationIntent({
        target: "team",
        rawDisplay: rawForStorage,
        playerId: null,
        sentiment,
        domain: onto.domain,
        skill: onto.skill,
        confidence: conf,
      }),
    };
  }

  if (target === "session") {
    return {
      ok: true,
      intent: buildArenaObservationIntent({
        target: "session",
        rawDisplay: rawForStorage,
        playerId: null,
        sentiment,
        domain: onto.domain,
        skill: onto.skill,
        confidence: conf,
      }),
    };
  }

  return { ok: true, intent: { kind: "unknown", rawTranscript: raw } };
}
