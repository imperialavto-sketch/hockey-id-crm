/**
 * PHASE 2 — Safe auto-persist policy for voice-originated observations.
 *
 * GROUNDING CONTRACT
 * --------------------
 * This policy only gates whether the existing voice pipeline may proceed without extra
 * manual review steps implied by parser flags — it does not invent entities or relax
 * server-side validation. Ambiguous / high-risk transcripts stay on clarification paths.
 */

import type { ArenaParsedIntent } from "@/lib/arenaVoiceIntentParser";

export type ArenaSafeAutoPersistVerdict =
  | { safe: true; reason: string }
  | { safe: false; reason: string };

/** Russian keywords: discipline / conflict — never auto-fast-path beyond parser defaults. */
const RE_DISCIPLINE_OR_CONFLICT =
  /драк|удален|груб|оскорб|конфликт|дисциплин|мат\s|ругал|неспорт/i;

const MIN_VOICE_CONFIDENCE = 0.58;

export function evaluateArenaSafeAutoPersistForVoiceIntent(intent: ArenaParsedIntent): ArenaSafeAutoPersistVerdict {
  if (
    intent.kind !== "create_player_observation" &&
    intent.kind !== "create_team_observation" &&
    intent.kind !== "create_session_observation"
  ) {
    return { safe: false, reason: "not_an_observation_intent" };
  }

  if (intent.needsReview) {
    return { safe: false, reason: "parser_flagged_needs_review" };
  }

  if (typeof intent.confidence === "number" && intent.confidence < MIN_VOICE_CONFIDENCE) {
    return { safe: false, reason: "below_min_voice_confidence" };
  }

  const raw = intent.rawText ?? "";
  if (RE_DISCIPLINE_OR_CONFLICT.test(raw)) {
    return { safe: false, reason: "potential_discipline_or_conflict_language" };
  }

  if (intent.kind === "create_player_observation") {
    if (!intent.playerId?.trim()) {
      return { safe: false, reason: "missing_player_id" };
    }
    return { safe: true, reason: "explicit_player_observation_clear_parser_flags" };
  }

  if (intent.kind === "create_team_observation") {
    return { safe: true, reason: "explicit_team_target_observation" };
  }

  return { safe: true, reason: "explicit_session_target_observation" };
}
