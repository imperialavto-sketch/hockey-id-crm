/**
 * Разбор короткого follow-up при активном pending clarification.
 */

import type { ArenaConversationContext } from "@/lib/arenaConversationContext";
import type { ArenaTargetType } from "@/lib/arenaConversationContext";
import type { ArenaPendingClarificationActive } from "@/lib/arenaPendingClarification";
import {
  ARENA_RESOLVE_MEANING_REPEAT_FULL,
  ARENA_RESOLVE_NEED_PLAYER_NAME,
  ARENA_RESOLVE_NEED_SURNAME,
  ARENA_RESOLVE_ROLE_NO_MATCH,
  ARENA_RESOLVE_SURNAME_OR_ROLE,
  ARENA_RESOLVE_TARGET_PICK_RETRY,
} from "@/lib/arenaVoicePhrases";
import {
  buildArenaObservationIntent,
  matchRosterHint,
  normalizeArenaText,
  parseArenaCommand,
  stripWakeWordFromTranscript,
  type ArenaParsedIntent,
  type RosterEntry,
} from "@/lib/arenaVoiceIntentParser";
import { normalizeArenaTranscript } from "@/lib/arenaTranscriptNormalizer";

export type ClarificationResolveResult =
  | { kind: "resolved"; intent: ArenaParsedIntent }
  | { kind: "retry"; followUpHint: string }
  | { kind: "cancelled" };

const RE_CANCEL =
  /^(отмена|не\s+надо|забудь|хватит|стоп|удали|убери|нет)$/i;

type RoleKind = "defense" | "forward" | "goalie";

function rosterRoleFromPosition(position: string | undefined): RoleKind | null {
  const n = normalizeArenaText(position ?? "");
  if (!n) return null;
  if (/вратар|goalie|\bgk\b|\bg\b/.test(n)) return "goalie";
  if (/защит|defen|\bd\b/.test(n)) return "defense";
  if (/напад|форвард|forward|\bf\b|\blw\b|\brw\b|\bc\b/.test(n)) return "forward";
  return null;
}

function followUpRoleHint(n: string): RoleKind | null {
  // `\b` is unreliable for Cyrillic in JavaScript
  if (n.startsWith("защитник") || /(?:^|[\s.,;:!?])защитник/.test(n)) return "defense";
  if (n.startsWith("нападающ") || /(?:^|[\s.,;:!?])нападающ/.test(n)) return "forward";
  if (n.startsWith("вратар") || /(?:^|[\s.,;:!?])вратар/.test(n)) return "goalie";
  return null;
}

function filterByRole(list: RosterEntry[], role: RoleKind): RosterEntry[] {
  return list.filter((c) => rosterRoleFromPosition(c.position) === role);
}

function ordinalPick(list: RosterEntry[], n: string): RosterEntry | null {
  if (list.length === 0) return null;
  const tail = "(?=[\\s.,;:!?]|$)";
  if (new RegExp(`^перв(ый|ая|ое|ые)${tail}`).test(n)) return list[0] ?? null;
  if (new RegExp(`^втор(ой|ая|ое|ые)${tail}`).test(n)) return list[1] ?? null;
  if (new RegExp(`^трет(ий|ья|ье|ьи)${tail}`).test(n)) return list[2] ?? null;
  return null;
}

function resolveTargetFromFollowUp(n: string): ArenaTargetType | null {
  if (
    /пятёрк|пятерк|про\s+пятёр|про\s+пятер|про\s+всю\s+пятер|про\s+всю\s+пятёр|всю\s+пятер|всю\s+пятёр|вся\s+пятерк|вся\s+пятёрк|всю\s+команд|вся\s+команд|звен|про\s+команд|команду(?:\s|$|[.,;:!?])/.test(
      n
    )
  ) {
    return "team";
  }
  if (/про\s+сесс|сессию|тренировк|сегодняшн|в\s+целом\s+по/.test(n)) {
    return "session";
  }
  if (/про\s+игрок|конкретн\w*\s+игрок/.test(n)) {
    return "player";
  }
  return null;
}

/**
 * followUpRaw — как распозналось (может содержать «Арена» — снаружи уже могли очистить).
 */
export function resolveArenaClarificationFollowUp(input: {
  followUpRaw: string;
  pending: ArenaPendingClarificationActive;
  roster: RosterEntry[];
  conversationCtx: ArenaConversationContext;
}): ClarificationResolveResult {
  const raw = input.followUpRaw.trim();
  if (!raw) return { kind: "retry", followUpHint: input.pending.prompt };

  const n = stripWakeWordFromTranscript(raw);
  if (!n) return { kind: "retry", followUpHint: input.pending.prompt };

  if (RE_CANCEL.test(n)) {
    return { kind: "cancelled" };
  }

  const po = input.pending.pendingObservation;
  const cands = input.pending.candidates ?? [];
  const roster = input.roster;

  if (input.pending.clarificationType === "player") {
    const role = followUpRoleHint(n);
    if (role && cands.length >= 1) {
      const f = filterByRole(cands, role);
      if (f.length === 1) {
        const pl = f[0]!;
        const conf = Math.min(1, po.ontoConfidence + 0.15);
        return {
          kind: "resolved",
          intent: buildArenaObservationIntent({
            target: "player",
            rawDisplay: po.rawForStorage,
            playerId: pl.id,
            sentiment: po.sentiment,
            domain: po.domain,
            skill: po.skill,
            confidence: conf,
          }),
        };
      }
      if (f.length === 0) {
        return {
          kind: "retry",
          followUpHint: ARENA_RESOLVE_ROLE_NO_MATCH,
        };
      }
      return { kind: "retry", followUpHint: ARENA_RESOLVE_NEED_SURNAME };
    }

    const byOrd = cands.length >= 2 ? ordinalPick(cands, n) : null;
    if (byOrd) {
      return {
        kind: "resolved",
        intent: buildArenaObservationIntent({
          target: "player",
          rawDisplay: po.rawForStorage,
          playerId: byOrd.id,
          sentiment: po.sentiment,
          domain: po.domain,
          skill: po.skill,
          confidence: Math.min(1, po.ontoConfidence + 0.12),
        }),
      };
    }

    const hintPl = matchRosterHint(raw, cands.length ? cands : roster);
    if (hintPl) {
      return {
        kind: "resolved",
        intent: buildArenaObservationIntent({
          target: "player",
          rawDisplay: po.rawForStorage,
          playerId: hintPl.id,
          sentiment: po.sentiment,
          domain: po.domain,
          skill: po.skill,
          confidence: Math.min(1, po.ontoConfidence + 0.12),
        }),
      };
    }

    const proNeg =
      n.match(/^(?:нет|не)[,.\s]+про\s+(.+)$/i) ?? n.match(/^про\s+(.+)$/i);
    const hintRaw = normalizeArenaTranscript((proNeg?.[1] ?? "").trim());
    if (hintRaw.length >= 2) {
      const pl2 = matchRosterHint(hintRaw, cands.length ? cands : roster);
      if (pl2) {
        return {
          kind: "resolved",
          intent: buildArenaObservationIntent({
            target: "player",
            rawDisplay: po.rawForStorage,
            playerId: pl2.id,
            sentiment: po.sentiment,
            domain: po.domain,
            skill: po.skill,
            confidence: Math.min(1, po.ontoConfidence + 0.12),
          }),
        };
      }
    }

    return { kind: "retry", followUpHint: ARENA_RESOLVE_SURNAME_OR_ROLE };
  }

  if (input.pending.clarificationType === "target") {
    const t = resolveTargetFromFollowUp(n);
    if (t === "team" || t === "session") {
      return {
        kind: "resolved",
        intent: buildArenaObservationIntent({
          target: t,
          rawDisplay: po.rawForStorage,
          playerId: null,
          sentiment: po.sentiment,
          domain: po.domain,
          skill: po.skill,
          confidence: Math.min(1, po.ontoConfidence + 0.1),
        }),
      };
    }
    if (t === "player") {
      const pl = matchRosterHint(raw, roster);
      if (pl) {
        return {
          kind: "resolved",
          intent: buildArenaObservationIntent({
            target: "player",
            rawDisplay: po.rawForStorage,
            playerId: pl.id,
            sentiment: po.sentiment,
            domain: po.domain,
            skill: po.skill,
            confidence: Math.min(1, po.ontoConfidence + 0.12),
          }),
        };
      }
      return { kind: "retry", followUpHint: ARENA_RESOLVE_NEED_PLAYER_NAME };
    }

    const pl3 = matchRosterHint(raw, roster);
    if (pl3) {
      return {
        kind: "resolved",
        intent: buildArenaObservationIntent({
          target: "player",
          rawDisplay: po.rawForStorage,
          playerId: pl3.id,
          sentiment: po.sentiment,
          domain: po.domain,
          skill: po.skill,
          confidence: Math.min(1, po.ontoConfidence + 0.12),
        }),
      };
    }

    return { kind: "retry", followUpHint: ARENA_RESOLVE_TARGET_PICK_RETRY };
  }

  /** meaning */
  const merged = `${po.rawForStorage} ${raw}`.trim();
  const tryParse = (t: string) => parseArenaCommand(t, roster, input.conversationCtx);

  let parsed = n.length >= 10 ? tryParse(raw) : tryParse(merged);
  if (!parsed.ok) {
    parsed = tryParse(merged);
  }
  if (parsed.ok) {
    const k = parsed.intent.kind;
    if (
      k === "create_player_observation" ||
      k === "create_team_observation" ||
      k === "create_session_observation"
    ) {
      return { kind: "resolved", intent: parsed.intent };
    }
  }

  if (merged.length >= 12) {
    const p2 = tryParse(merged);
    if (p2.ok) {
      const k = p2.intent.kind;
      if (
        k === "create_player_observation" ||
        k === "create_team_observation" ||
        k === "create_session_observation"
      ) {
        return { kind: "resolved", intent: p2.intent };
      }
    }
  }

  return { kind: "retry", followUpHint: ARENA_RESOLVE_MEANING_REPEAT_FULL };
}
