/**
 * Session Follow-up Suggestions — actionable next steps from session
 */

import type { CompletedTrainingSession, SessionObservation } from "@/models/sessionObservation";
import { countImpacts } from "./sessionReviewHelpers";
import type { SessionPlayerSummary } from "./sessionReviewCenterHelpers";

export type FollowUpType =
  | "need_followup"
  | "prepare_parent_message"
  | "watch_next_session"
  | "progress_noted";

export interface FollowUpItem {
  playerId: string;
  playerName: string;
  type: FollowUpType;
  typeLabel: string;
  reasonLine: string;
  ctaLabel: "Открыть" | "Сообщение";
  ctaRoute: string;
  priority: number;
}

const MAX_ITEMS = 5;

const TYPE_PRIORITY: Record<FollowUpType, number> = {
  need_followup: 0,
  prepare_parent_message: 1,
  watch_next_session: 2,
  progress_noted: 3,
};

function getPlayerObservations(
  session: CompletedTrainingSession,
  playerId: string
): SessionObservation[] {
  return session.observations.filter((o) => o.playerId === playerId);
}

function classifyPlayer(
  obs: SessionObservation[],
  playerSummary: SessionPlayerSummary
): { type: FollowUpType; typeLabel: string; reasonLine: string } | null {
  const counts = countImpacts(obs);
  const total = obs.length;

  if (total === 0) return null;

  const hasNegative = counts.negative > 0;
  const hasPositive = counts.positive > 0;
  const predominantlyPositive =
    counts.positive > counts.negative && counts.positive > counts.neutral;
  const mixed = hasNegative && hasPositive;
  const negativeDominant = counts.negative >= counts.positive;

  if (hasNegative || mixed || negativeDominant) {
    const reason =
      negativeDominant
        ? "Есть негативные сигналы"
        : mixed
          ? "Смешанная динамика"
          : "Требует внимания";
    return {
      type: "need_followup",
      typeLabel: "Нужен follow-up",
      reasonLine: reason,
    };
  }

  if (playerSummary.hasParentDraft) {
    return {
      type: "prepare_parent_message",
      typeLabel: "Подготовить сообщение родителю",
      reasonLine: "Готово к отчёту",
    };
  }

  if (total <= 2 && (counts.positive > 0 || counts.negative > 0)) {
    return {
      type: "watch_next_session",
      typeLabel: "Посмотреть на следующей тренировке",
      reasonLine: "Мало наблюдений, стоит проверить",
    };
  }

  if (predominantlyPositive) {
    return {
      type: "progress_noted",
      typeLabel: "Отмечен прогресс",
      reasonLine: "Преимущественно позитивные сигналы",
    };
  }

  return null;
}

export function buildSessionFollowUpItems(
  session: CompletedTrainingSession | null,
  players: SessionPlayerSummary[]
): FollowUpItem[] {
  if (!session || players.length === 0) return [];

  const items: FollowUpItem[] = [];

  for (const player of players) {
    const obs = getPlayerObservations(session, player.playerId);
    const classified = classifyPlayer(obs, player);
    if (!classified) continue;

    const ctaLabel: FollowUpItem["ctaLabel"] =
      classified.type === "prepare_parent_message"
        ? "Сообщение"
        : "Открыть";

    const ctaRoute =
      classified.type === "prepare_parent_message"
        ? `/player/${player.playerId}/share-report`
        : classified.type === "need_followup" && player.hasReport
          ? `/player/${player.playerId}/report`
          : `/player/${player.playerId}`;

    items.push({
      playerId: player.playerId,
      playerName: player.playerName,
      type: classified.type,
      typeLabel: classified.typeLabel,
      reasonLine: classified.reasonLine,
      ctaLabel,
      ctaRoute,
      priority: TYPE_PRIORITY[classified.type],
    });
  }

  items.sort((a, b) => a.priority - b.priority);
  return items.slice(0, MAX_ITEMS);
}
