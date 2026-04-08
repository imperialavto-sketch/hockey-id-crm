/**
 * Arena Intent Parser — rule-based слой «понимания» речи тренера (без GPT).
 * Sentiment: V2 в arena-sentiment.ts. Primary player: V3 в arena-player-mentions.ts.
 */

import { pickPrimaryArenaPlayerMention } from "./arena-player-mentions";
import { detectArenaSentiment, normalizeArenaText } from "./arena-sentiment";

export type ArenaParseInput = {
  transcript: string;
  roster: {
    id: string;
    name: string;
    jerseyNumber?: number;
  }[];
};

export type ArenaIntent =
  | {
      kind: "create_player_observation";
      playerId: string | null;
      confidence: number;
      sentiment?: "positive" | "neutral" | "negative";
      text: string;
    }
  | {
      kind: "create_team_observation";
      text: string;
      sentiment?: "positive" | "neutral" | "negative";
    }
  | {
      kind: "unknown";
      text: string;
    };

function normalizeForMatch(s: string): string {
  return normalizeArenaText(s);
}

function hasTeamKeyword(transcript: string): boolean {
  const t = normalizeForMatch(transcript);
  const words = t.split(/[\s,.:;!?«»"'()—–-]+/).filter(Boolean);
  const teamWords = new Set(["команда", "все", "группа"]);
  return words.some((w) => teamWords.has(w));
}

function resolvePrimaryPlayer(
  transcriptLower: string,
  roster: ArenaParseInput["roster"]
): { playerId: string; confidence: number } | null {
  const primary = pickPrimaryArenaPlayerMention(transcriptLower, roster);
  if (!primary) return null;
  return { playerId: primary.playerId, confidence: primary.baseConfidence };
}

/**
 * Примеры V1 (при наличии игрока «Иванов» id=p1 и «Петров» с jerseyNumber 17):
 *
 * | transcript              | intent                      | примечание              |
 * |-------------------------|-----------------------------|-------------------------|
 * | Иванов хорошо в борьбе  | create_player_observation   | confidence 0.85, +      |
 * | номер 17 отлично        | create_player_observation   | confidence 0.6, +       |
 * | команда сегодня плохо   | create_team_observation     | −                       |
 * | все ок по группе       | create_team_observation     | токен «все»             |
 * | запиши это как есть     | unknown                     | нет игрока/team-слов    |
 */
export function parseArenaIntent(input: ArenaParseInput): ArenaIntent {
  const text = input.transcript.trim();
  const transcriptLower = normalizeForMatch(text);
  if (!transcriptLower) {
    return { kind: "unknown", text };
  }

  const sentiment = detectArenaSentiment(transcriptLower);
  const primaryPlayer = resolvePrimaryPlayer(transcriptLower, input.roster);
  const team = hasTeamKeyword(text);

  if (primaryPlayer) {
    return {
      kind: "create_player_observation",
      playerId: primaryPlayer.playerId,
      confidence: primaryPlayer.confidence,
      sentiment,
      text,
    };
  }

  if (team) {
    return {
      kind: "create_team_observation",
      text,
      sentiment,
    };
  }

  return { kind: "unknown", text };
}
